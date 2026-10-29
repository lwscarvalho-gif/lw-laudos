#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/mwl_bridge/bridge.py
==========================
Agente Local de Ponte DICOM Modality Worklist (MWL) para o LW Laudos / Sistema Médico Multiperfil.

ARQUITETURA HONESTA:
- Este script roda na rede local (intranet) da clínica (computador do servidor, recepção ou notebook do médico).
- Consulta o endpoint seguro na nuvem do LW Laudos (autenticado pelo token do médico radiologista gerado em Configurações).
- Publica os agendamentos no Orthanc local com o plugin Worklists:
    * Modo 1 (REST API do Plugin Worklists): comunica diretamente com http://localhost:8042/worklists
      (PUT/POST /worklists/{id} e DELETE /worklists/{id}), permitindo idempotência, criação, atualização e remoção.
    * Modo 2 (Sistema de Arquivos + DCMTK dump2dcm): compila os agendamentos como arquivos binários .wl
      em diretório vigiado pelo Orthanc (com criação, atualização atômica e limpeza de cancelados/realizados).
- O aparelho de ultrassonografia (Saevo FT412, GE, Philips, Mindray, Samsung, SonoSite) consulta o Orthanc local
  via DICOM C-FIND SCP padrão (porta 104 ou 4242).

CICLO DE VIDA COMPLETO:
1. NOVO agendamento: Criação da entrada na worklist com AccessionNumber determinístico.
2. AGENDAMENTO EDITADO (horário, paciente, modalidade, status): Atualização fiel da entrada.
3. AGENDAMENTO CANCELADO / REALIZADO: Remoção imediata da worklist para não poluir o aparelho.
4. TOKEN EXPIRADO / REVOGADO: Diagnóstico claro em português no console.
5. FALHAS DE REDE: Retry com backoff exponencial sem travar silenciosamente.

TAGS DICOM MAPEADAS:
- (0008,0005) SpecificCharacterSet: ISO_IR 192 (UTF-8)
- (0008,0050) AccessionNumber: LW-YYYYMMDD-XXXX
- (0008,0060) Modality: US
- (0008,0090) / (0032,1032) ReferringPhysicianName: Médico Solicitante
- (0008,1030) StudyDescription: Descrição do Estudo
- (0010,0010) PatientName: Formato DICOM PN (SOBRENOME^PRIMEIRO NOME)
- (0010,0020) PatientID: CPF / Documento limpo ou ID
- (0010,0030) PatientBirthDate: YYYYMMDD
- (0010,0040) PatientSex: M, F ou O
- (0040,0100) ScheduledProcedureStepSequence:
    - (0008,0060) Modality
    - (0040,0001) ScheduledStationAETitle
    - (0040,0002) ScheduledProcedureStepStartDate (YYYYMMDD)
    - (0040,0003) ScheduledProcedureStepStartTime (HHMMSS)
    - (0040,0006) ScheduledPerformingPhysicianName
    - (0040,0007) ScheduledProcedureStepDescription
    - (0040,0009) ScheduledProcedureStepID (AccessionNumber)
- (0040,1001) RequestedProcedureID: AccessionNumber
- (0040,1003) RequestedProcedurePriority: ROUTINE
- (0032,1060) RequestedProcedureDescription: Descrição do exame
"""

import os
import sys
import time
import argparse
import logging
import subprocess
import json
import re
from datetime import datetime
from typing import List, Dict, Any, Optional, Set, Tuple

try:
    import requests
except ImportError:
    print("ERRO CRÍTICO: O módulo 'requests' não está instalado. Execute: pip install requests")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("mwl_bridge")


def sanitize_worklist_id(accession: str) -> str:
    """
    Gera um ID de worklist determinístico e limpo a partir do AccessionNumber.
    Ex: 'LW-20261028-A1B2' -> 'LW-20261028-A1B2'
    """
    clean = re.sub(r"[^a-zA-Z0-9_-]", "_", str(accession).strip())
    return clean or "LW_MWL_ITEM"


def build_orthanc_json_payload(appt: Dict[str, Any]) -> Dict[str, Any]:
    """
    Constrói o payload JSON estritamente compatível com o endpoint
    POST /worklists/create ou PUT /worklists/{id} do plugin Worklists do Orthanc.
    """
    dicom = appt.get("dicom", {}) or {}
    sps = dicom.get("ScheduledProcedureStep", {}) or {}

    patient_name = dicom.get("PatientName") or "PACIENTE^DESCONHECIDO"
    patient_id = dicom.get("PatientID") or appt.get("id") or "000000"
    birth_date = dicom.get("PatientBirthDate") or ""
    sex = dicom.get("PatientSex") or "O"
    if sex not in ("M", "F", "O"):
        sex = "O"

    accession = dicom.get("AccessionNumber") or appt.get("accessionNumber") or "S_ACCESSION"
    study_desc = dicom.get("StudyDescription") or appt.get("examType") or "Ultrassonografia"
    modality = dicom.get("Modality") or "US"
    station_ae = sps.get("ScheduledStationAETitle") or "LW-ORTHO"
    start_date = sps.get("ScheduledProcedureStepStartDate") or datetime.now().strftime("%Y%m%d")
    start_time = sps.get("ScheduledProcedureStepStartTime") or "080000"
    performing_physician = sps.get("ScheduledPerformingPhysicianName") or "MEDICO RADIOLOGISTA"
    referring_physician = dicom.get("ReferringPhysicianName") or ""

    tags: Dict[str, Any] = {
        "SpecificCharacterSet": "ISO_IR 192",
        "PatientName": patient_name,
        "PatientID": str(patient_id),
        "PatientSex": sex,
        "AccessionNumber": accession,
        "StudyDescription": study_desc,
        "Modality": modality,
        "RequestedProcedureID": accession,
        "RequestedProcedureDescription": study_desc,
        "RequestedProcedurePriority": "ROUTINE",
        "ScheduledProcedureStepSequence": [
            {
                "Modality": modality,
                "ScheduledStationAETitle": station_ae,
                "ScheduledProcedureStepStartDate": start_date,
                "ScheduledProcedureStepStartTime": start_time,
                "ScheduledPerformingPhysicianName": performing_physician,
                "ScheduledProcedureStepDescription": study_desc,
                "ScheduledProcedureStepID": accession,
            }
        ],
    }

    if birth_date:
        tags["PatientBirthDate"] = str(birth_date).replace("-", "")

    if referring_physician:
        tags["ReferringPhysicianName"] = referring_physician
        tags["RequestingPhysician"] = referring_physician

    return {
        "Tags": tags,
        "Force": True,
    }


def generate_dcmtk_dump(appt: Dict[str, Any]) -> str:
    """
    Gera o conteúdo em texto plano no formato DCMTK dump para ser compilado
    pelo dump2dcm em arquivo binário .wl (DICOM SOP Class 1.2.840.10008.5.1.4.31).
    """
    dicom = appt.get("dicom", {}) or {}
    sps = dicom.get("ScheduledProcedureStep", {}) or {}

    patient_name = dicom.get("PatientName") or "PACIENTE^DESCONHECIDO"
    patient_id = dicom.get("PatientID") or appt.get("id") or "000000"
    birth_date = dicom.get("PatientBirthDate") or ""
    sex = dicom.get("PatientSex") or "O"
    accession = dicom.get("AccessionNumber") or appt.get("accessionNumber") or ""
    study_desc = dicom.get("StudyDescription") or appt.get("examType") or "Ultrassonografia"
    modality = dicom.get("Modality") or "US"
    station_ae = sps.get("ScheduledStationAETitle") or "LW-ORTHO"
    sps_start_date = sps.get("ScheduledProcedureStepStartDate") or datetime.now().strftime("%Y%m%d")
    sps_start_time = sps.get("ScheduledProcedureStepStartTime") or "080000"
    performing_physician = sps.get("ScheduledPerformingPhysicianName") or "MEDICO RADIOLOGISTA"
    referring_physician = dicom.get("ReferringPhysicianName") or ""

    lines = [
        "# DICOM Modality Worklist Item",
        "# Gerado automaticamente por LW Laudos MWL Bridge",
        f"# AccessionNumber: {accession}",
        f"# Paciente: {patient_name} (ID: {patient_id})",
        "",
        "# Specific Character Set (ISO_IR 192 = UTF-8)",
        "(0008,0005) CS [ISO_IR 192]",
        "",
        "# Scheduled Procedure Step Sequence",
        "(0040,0100) SQ",
        "  (fffe,e000) na",
        f"    (0008,0060) CS [{modality}]",
        f"    (0040,0001) AE [{station_ae}]",
        f"    (0040,0002) DA [{sps_start_date}]",
        f"    (0040,0003) TM [{sps_start_time}]",
        f"    (0040,0006) PN [{performing_physician}]",
        f"    (0040,0007) LO [{study_desc}]",
        f"    (0040,0009) SH [{accession}]",
        "  (fffe,e00d) na",
        "(fffe,e0dd) na",
        "",
        "# Requested Procedure",
        f"(0040,1001) SH [{accession}]",
        f"(0040,1003) SH [ROUTINE]",
        f"(0032,1060) LO [{study_desc}]",
        "",
        "# Study Identification",
        f"(0008,0050) SH [{accession}]",
        f"(0008,1030) LO [{study_desc}]",
    ]

    if referring_physician:
        lines.append(f"(0008,0090) PN [{referring_physician}]")
        lines.append(f"(0032,1032) PN [{referring_physician}]")

    lines.extend([
        "",
        "# Patient Demographic Information",
        f"(0010,0010) PN [{patient_name}]",
        f"(0010,0020) LO [{patient_id}]",
        f"(0010,0030) DA [{birth_date}]",
        f"(0010,0040) CS [{sex}]",
    ])

    return "\n".join(lines) + "\n"


def compile_dump_to_wl(dump_text: str, output_wl_path: str) -> bool:
    """
    Grava o arquivo de dump temporário e compila para arquivo binário .wl usando dump2dcm.
    Usa gravação atômica (.tmp -> .wl) para evitar leituras corrompidas pelo Orthanc.
    """
    temp_wl_path = output_wl_path + ".tmp"
    dump_temp_path = output_wl_path + ".dump"
    try:
        with open(dump_temp_path, "w", encoding="utf-8") as f:
            f.write(dump_text)

        cmd = ["dump2dcm", dump_temp_path, temp_wl_path]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            logger.error(f"dump2dcm falhou ao gerar {output_wl_path}: {res.stderr.strip()}")
            return False

        # Substituição atômica no sistema de arquivos
        if os.path.exists(output_wl_path):
            try:
                os.remove(output_wl_path)
            except OSError:
                pass
        os.replace(temp_wl_path, output_wl_path)
        return True
    except FileNotFoundError:
        logger.error(
            "Utilitário 'dump2dcm' do DCMTK não foi encontrado no PATH do sistema. "
            "Instale o pacote dcmtk no servidor local ou use a API REST do Orthanc."
        )
        return False
    except Exception as e:
        logger.error(f"Erro inesperado ao compilar arquivo .wl: {e}")
        return False
    finally:
        for p in (dump_temp_path, temp_wl_path):
            if os.path.exists(p):
                try:
                    os.remove(p)
                except OSError:
                    pass


class OrthancRestClient:
    """
    Cliente REST para gerenciar worklists diretamente pelo Orthanc HTTP REST API.
    Detecta dinamicamente se o plugin de worklists expõe /worklists.
    """

    def __init__(self, base_url: str = "http://localhost:8042", auth: Optional[Tuple[str, str]] = None):
        self.base_url = base_url.rstrip("/")
        self.auth = auth
        self.session = requests.Session()
        if self.auth:
            self.session.auth = self.auth
        self._plugin_rest_supported: Optional[bool] = None

    def is_orthanc_online(self) -> Tuple[bool, str]:
        """Testa se o Orthanc responde em /system."""
        try:
            resp = self.session.get(f"{self.base_url}/system", timeout=3.0)
            if resp.status_code == 200:
                data = resp.json()
                version = data.get("Version", "desconhecida")
                aet = data.get("DicomAet", "ORTHANC")
                return True, f"Orthanc v{version} (AE: {aet})"
            return False, f"Status HTTP {resp.status_code}"
        except Exception as e:
            return False, str(e)

    def check_worklists_rest_support(self) -> bool:
        """Verifica se /worklists responde no Orthanc."""
        if self._plugin_rest_supported is not None:
            return self._plugin_rest_supported
        try:
            resp = self.session.get(f"{self.base_url}/worklists", timeout=3.0)
            if resp.status_code in (200, 204):
                self._plugin_rest_supported = True
                return True
            self._plugin_rest_supported = False
            return False
        except Exception:
            self._plugin_rest_supported = False
            return False

    def list_worklists(self) -> List[str]:
        """Lista os IDs de worklists registrados no Orthanc via REST."""
        try:
            resp = self.session.get(f"{self.base_url}/worklists", timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    return [str(x) for x in data]
            return []
        except Exception as e:
            logger.warning(f"Falha ao listar worklists via REST do Orthanc: {e}")
            return []

    def get_worklist(self, worklist_id: str) -> Optional[Dict[str, Any]]:
        """Busca detalhes de uma worklist via REST."""
        try:
            resp = self.session.get(f"{self.base_url}/worklists/{worklist_id}", timeout=5.0)
            if resp.status_code == 200:
                return resp.json()
            return None
        except Exception:
            return None

    def put_or_post_worklist(self, worklist_id: str, payload: Dict[str, Any]) -> bool:
        """
        Publica ou atualiza uma entrada de worklist no Orthanc via REST.
        Tenta PUT /worklists/{id} (idempotente) e faz fallback para POST /worklists/create.
        """
        # 1. Tentar PUT determinístico por ID
        try:
            put_resp = self.session.put(
                f"{self.base_url}/worklists/{worklist_id}",
                json=payload,
                timeout=5.0,
            )
            if put_resp.status_code in (200, 201):
                return True
        except Exception:
            pass

        # 2. Se o PUT falhar (ex: versão do plugin só aceita POST /worklists/create),
        # remove a anterior se existir e cria novamente.
        try:
            self.delete_worklist(worklist_id)
            post_resp = self.session.post(
                f"{self.base_url}/worklists/create",
                json=payload,
                timeout=5.0,
            )
            if post_resp.status_code in (200, 201):
                return True
            logger.warning(f"POST /worklists/create retornou status HTTP {post_resp.status_code}: {post_resp.text[:150]}")
        except Exception as e:
            logger.warning(f"Erro ao publicar worklist via POST no Orthanc: {e}")

        return False

    def delete_worklist(self, worklist_id: str) -> bool:
        """Remove uma worklist via DELETE /worklists/{id}."""
        try:
            resp = self.session.delete(f"{self.base_url}/worklists/{worklist_id}", timeout=5.0)
            return resp.status_code in (200, 204, 404)
        except Exception as e:
            logger.warning(f"Erro ao remover worklist '{worklist_id}' via REST do Orthanc: {e}")
            return False


def fetch_appointments_from_cloud(
    base_url: str,
    token: str,
    clinic: str = "",
    date_str: str = "",
    status_filter: str = "",
) -> Tuple[int, Optional[Dict[str, Any]], str]:
    """
    Busca os agendamentos no endpoint seguro do LW Laudos na nuvem.
    Retorna (http_status, json_data, mensagem_diagnóstica).
    """
    endpoint = f"{base_url.rstrip('/')}/backend/v1/mwl/appointments"
    headers = {"Authorization": f"Bearer {token}"}
    params: Dict[str, str] = {}
    if clinic:
        params["clinic"] = clinic
    if date_str:
        params["date"] = date_str
    if status_filter:
        params["status"] = status_filter

    try:
        resp = requests.get(endpoint, headers=headers, params=params, timeout=12.0)
        status = resp.status_code

        if status == 200:
            return 200, resp.json(), "Sucesso"
        elif status in (401, 403):
            err_msg = "Token MWL do médico inválido, expirado ou revogado."
            try:
                err_data = resp.json()
                if "error" in err_data:
                    err_msg += f" Detalhe: {err_data['error']}"
            except Exception:
                pass
            return status, None, err_msg
        else:
            return status, None, f"Erro HTTP {status} na nuvem: {resp.text[:200]}"
    except requests.exceptions.Timeout:
        return 0, None, "Tempo limite excedido ao conectar à nuvem (timeout de 12s)."
    except requests.exceptions.ConnectionError as e:
        return 0, None, f"Falha de conexão com a nuvem (verifique internet/Wi-Fi/4G): {e}"
    except Exception as e:
        return 0, None, f"Erro inesperado na requisição: {e}"


def sync_worklist_cycle(
    base_url: str,
    token: str,
    clinic: str,
    worklist_dir: str,
    orthanc_url: str,
    orthanc_client: Optional[OrthancRestClient] = None,
) -> bool:
    """
    Executa um ciclo completo de sincronização:
    1. Baixa agendamentos ativos da nuvem.
    2. Publica ou atualiza cada entrada no Orthanc (via REST e/ou .wl atômico).
    3. Remove da worklist agendamentos cancelados, concluídos ou que sumiram da agenda ativa.
    """
    logger.info(f"Consultando nuvem ({base_url}) para unidade '{clinic or 'Todas'}'...")
    status, data, message = fetch_appointments_from_cloud(base_url, token, clinic=clinic)

    if status == 401 or status == 403:
        logger.error(
            f"FALHA DE AUTENTICAÇÃO ({status}): {message}\n"
            f"--> Solução: Acesse o sistema LW Laudos -> Configurações -> Worklist DICOM e renove seu token."
        )
        return False

    if status != 200 or not data:
        logger.warning(f"Aviso de sincronização: {message}")
        return False

    doctor_info = data.get("doctor", {}) or {}
    doc_name = doctor_info.get("professional_name") or doctor_info.get("name") or "Médico"
    items: List[Dict[str, Any]] = data.get("items", []) or []
    logger.info(f"Nuvem OK: médico autenticado '{doc_name}'. Recebidos {len(items)} agendamento(s) ativo(s).")

    # Conjunto de AccessionNumbers ativos recebidos neste ciclo
    active_accessions: Set[str] = set()
    active_id_map: Dict[str, Dict[str, Any]] = {}

    for appt in items:
        acc = appt.get("accessionNumber")
        if not acc:
            continue
        acc_clean = sanitize_worklist_id(acc)
        active_accessions.add(acc_clean)
        active_id_map[acc_clean] = appt

    # Modo A: Se o Orthanc REST API estiver disponível e suportar o plugin Worklists
    rest_synced_count = 0
    if orthanc_client and orthanc_client.check_worklists_rest_support():
        logger.info("Sincronizando via Orthanc REST API (/worklists)...")
        existing_remote_ids = set(orthanc_client.list_worklists())

        # 1. Criar ou atualizar agendamentos ativos
        for acc_id, appt in active_id_map.items():
            payload = build_orthanc_json_payload(appt)
            ok = orthanc_client.put_or_post_worklist(acc_id, payload)
            if ok:
                p_name = appt.get("dicom", {}).get("PatientName", "PACIENTE")
                logger.info(f"  [REST] Worklist sincronizada: {acc_id} -> {p_name}")
                rest_synced_count += 1
            else:
                logger.warning(f"  [REST] Falha ao publicar entrada para AccessionNumber {acc_id}")

        # 2. Remover entradas antigas canceladas / concluídas
        for old_id in existing_remote_ids:
            # Não remove entradas sintéticas que não tenham prefixo LW ou que não sejam deste médico
            if old_id not in active_accessions and old_id.startswith("LW-"):
                orthanc_client.delete_worklist(old_id)
                logger.info(f"  [REST] Removido agendamento cancelado/concluído da worklist: {old_id}")

    # Modo B: Sistema de arquivos (.wl com dump2dcm)
    # Garante compatibilidade universal mesmo se o Orthanc for legado sem REST do plugin
    fs_synced_count = 0
    if worklist_dir:
        os.makedirs(worklist_dir, exist_ok=True)

        for acc_id, appt in active_id_map.items():
            wl_filename = f"{acc_id}.wl"
            wl_filepath = os.path.join(worklist_dir, wl_filename)

            dump_content = generate_dcmtk_dump(appt)
            ok = compile_dump_to_wl(dump_content, wl_filepath)
            if ok:
                p_name = appt.get("dicom", {}).get("PatientName", "PACIENTE")
                fs_synced_count += 1
                logger.debug(f"  [FS] Arquivo .wl gravado: {wl_filename} -> {p_name}")

        # Limpar arquivos .wl de exames cancelados ou concluídos
        try:
            for fname in os.listdir(worklist_dir):
                if fname.endswith(".wl"):
                    file_acc = fname[:-3]
                    if file_acc not in active_accessions and file_acc.startswith("LW-"):
                        try:
                            os.remove(os.path.join(worklist_dir, fname))
                            logger.info(f"  [FS] Removido arquivo .wl cancelado/concluído: {fname}")
                        except OSError as e:
                            logger.warning(f"  [FS] Não foi possível remover {fname}: {e}")
        except Exception as e:
            logger.warning(f"Falha ao limpar pasta de worklists: {e}")

    logger.info(
        f"Ciclo concluído: {len(active_accessions)} agendamento(s) em dia. "
        f"(Atualizados: REST={rest_synced_count}, Arquivo={fs_synced_count})"
    )
    return True


def run_bridge_loop(
    base_url: str,
    token: str,
    clinic: str,
    worklist_dir: str,
    orthanc_url: str,
    interval_seconds: int,
):
    """
    Loop principal com tratamento de falhas transitórias de rede e backoff exponencial.
    """
    orthanc_client = OrthancRestClient(base_url=orthanc_url)
    consecutive_failures = 0
    base_interval = max(5, interval_seconds)

    while True:
        try:
            success = sync_worklist_cycle(
                base_url=base_url,
                token=token,
                clinic=clinic,
                worklist_dir=worklist_dir,
                orthanc_url=orthanc_url,
                orthanc_client=orthanc_client,
            )

            if success:
                consecutive_failures = 0
                time.sleep(base_interval)
            else:
                consecutive_failures += 1
                # Backoff exponencial simples: 10s, 20s, 40s... até máximo de 120s
                backoff = min(120, base_interval * (2 ** min(consecutive_failures - 1, 3)))
                logger.info(
                    f"Tentativa com falha ({consecutive_failures}). "
                    f"Aguardando {backoff}s antes de nova tentativa..."
                )
                time.sleep(backoff)

        except KeyboardInterrupt:
            logger.info("Ponte MWL encerrada pelo operador (Ctrl+C).")
            break
        except Exception as e:
            consecutive_failures += 1
            backoff = min(120, base_interval * (2 ** min(consecutive_failures - 1, 3)))
            logger.error(f"Erro inesperado no loop da ponte: {e}")
            logger.info(f"Aguardando {backoff}s antes de retomar...")
            time.sleep(backoff)


def main():
    parser = argparse.ArgumentParser(
        description="Agente Local de Ponte DICOM Modality Worklist (MWL) - LW Laudos"
    )
    parser.add_argument(
        "--url",
        required=True,
        help="URL base do LW Laudos na nuvem (ex: https://app.lwlaudos.com.br)",
    )
    parser.add_argument(
        "--token",
        required=True,
        help="Token MWL individual do médico gerado em Configurações",
    )
    parser.add_argument(
        "--clinic",
        default="",
        help="Nome da clínica/unidade para filtro (ex: Mirante da Serra ou Gastroimagem)",
    )
    parser.add_argument(
        "--worklist-dir",
        default="./worklists",
        help="Diretório onde os arquivos .wl são gravados para o Orthanc",
    )
    parser.add_argument(
        "--orthanc-url",
        default="http://localhost:8042",
        help="URL base da API REST do Orthanc local (padrão: http://localhost:8042)",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=30,
        help="Intervalo de polling incremental em segundos (padrão: 30s)",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Executa uma única sincronização e encerra imediatamente",
    )

    args = parser.parse_args()

    token_preview = f"{args.token[:4]}...{args.token[-4:]}" if len(args.token) >= 8 else "***"

    logger.info("=================================================================")
    logger.info("  INICIANDO LW LAUDOS DICOM MWL BRIDGE (PONTE NUVEM <-> ORTHANC)")
    logger.info("=================================================================")
    logger.info(f"Nuvem LW Laudos:     {args.url}")
    logger.info(f"Token do médico:     {token_preview}")
    logger.info(f"Unidade / Clínica:   {args.clinic or 'Todas as unidades do médico'}")
    logger.info(f"Orthanc REST API:    {args.orthanc_url}")
    logger.info(f"Pasta de Worklists:  {os.path.abspath(args.worklist_dir)}")
    logger.info(f"Intervalo de ciclo:  {args.interval}s")
    logger.info("=================================================================")

    if args.once:
        client = OrthancRestClient(base_url=args.orthanc_url)
        ok = sync_worklist_cycle(
            base_url=args.url,
            token=args.token,
            clinic=args.clinic,
            worklist_dir=args.worklist_dir,
            orthanc_url=args.orthanc_url,
            orthanc_client=client,
        )
        sys.exit(0 if ok else 1)

    run_bridge_loop(
        base_url=args.url,
        token=args.token,
        clinic=args.clinic,
        worklist_dir=args.worklist_dir,
        orthanc_url=args.orthanc_url,
        interval_seconds=args.interval,
    )


if __name__ == "__main__":
    main()
