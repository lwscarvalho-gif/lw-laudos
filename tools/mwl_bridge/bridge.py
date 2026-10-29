#!/usr/bin/env python3
"""
tools/mwl_bridge/bridge.py
==========================
Agente Local de Ponte DICOM Modality Worklist (MWL) para o LW Laudos.

ARQUITETURA HONESTA:
- Este script roda na rede local (intranet) da clínica (computador do servidor ou recepção).
- Consulta o endpoint seguro na nuvem do LW Laudos (autenticado pelo token do médico radiologista).
- Converte os agendamentos recebidos em arquivos DICOM Worklist (.dump / .wl com DCMTK dump2dcm)
  ou envia para o Orthanc local via plugin Worklists.
- O aparelho de ultrassonografia (GE, Philips, Mindray, Samsung, SonoSite) consulta o Orthanc local
  via DICOM C-FIND SCP padrão (porta 104 ou 4242).

REQUISITOS LOCAIS NA CLÍNICA:
- Python 3.8+
- Bibliotecas: pip install requests
- Utilitário DCMTK dump2dcm instalado no PATH (ex: sudo apt install dcmtk ou dcmtk no Windows)
- Servidor Orthanc com o plugin "Worklists" ativo e configurado para ler o diretório de worklists.

USO:
  python3 bridge.py \
    --url "https://seu-dominio-lwlaudos.com" \
    --token "SEU_TOKEN_MWL_GERADO_NO_SISTEMA" \
    --clinic "Gastroimagem" \
    --worklist-dir "/var/lib/orthanc/worklists" \
    --interval 60

EM DUAS CLÍNICAS:
  - Na Clínica 1 (Gastroimagem): rode com --clinic "Gastroimagem"
  - Na Clínica 2 (Clínica Principal): rode com --clinic "Clínica Principal"
"""

import os
import sys
import time
import argparse
import logging
import subprocess
from datetime import datetime
from typing import List, Dict, Any

try:
    import requests
except ImportError:
    print("ERRO: O módulo 'requests' não está instalado. Execute: pip install requests")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("mwl_bridge")


def generate_dcmtk_dump(appt: Dict[str, Any]) -> str:
    """
    Gera o conteúdo em texto plano no formato DCMTK dump para ser compilado
    pelo dump2dcm em arquivo binário .wl (DICOM SOP Class 1.2.840.10008.5.1.4.31).
    """
    dicom = appt.get("dicom", {})
    sps = dicom.get("ScheduledProcedureStep", {})

    patient_name = dicom.get("PatientName", "PACIENTE^DESCONHECIDO")
    patient_id = dicom.get("PatientID", appt.get("id", "000000"))
    birth_date = dicom.get("PatientBirthDate", "")
    sex = dicom.get("PatientSex", "O")
    accession = dicom.get("AccessionNumber", appt.get("accessionNumber", ""))
    study_desc = dicom.get("StudyDescription", appt.get("examType", "Ultrassonografia"))
    modality = dicom.get("Modality", "US")
    station_ae = sps.get("ScheduledStationAETitle", "ORTHANC")
    sps_start_date = sps.get("ScheduledProcedureStepStartDate", "")
    sps_start_time = sps.get("ScheduledProcedureStepStartTime", "080000")
    performing_physician = sps.get("ScheduledPerformingPhysicianName", "MEDICO RADIOLOGISTA")

    # Construct DCMTK dump lines
    lines = [
        "# DICOM Modality Worklist Item",
        "# Gerado automaticamente por LW Laudos MWL Bridge",
        f"# AccessionNumber: {accession}",
        "",
        "# Specific Character Set (ISO_IR 192 = UTF-8 ou ISO_IR 100 = Latin-1)",
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
        f"(0032,1060) LO [{study_desc}]",
        "",
        "# Study identification",
        f"(0008,0050) SH [{accession}]",
        f"(0008,1030) LO [{study_desc}]",
        "",
        "# Patient Demographic Information",
        f"(0010,0010) PN [{patient_name}]",
        f"(0010,0020) LO [{patient_id}]",
        f"(0010,0030) DA [{birth_date}]",
        f"(0010,0040) CS [{sex}]",
    ]
    return "\n".join(lines) + "\n"


def compile_dump_to_wl(dump_text: str, output_wl_path: str) -> bool:
    """
    Grava o arquivo de dump temporário e compila para arquivo binário .wl usando dump2dcm.
    """
    dump_temp_path = output_wl_path + ".dump"
    try:
        with open(dump_temp_path, "w", encoding="utf-8") as f:
            f.write(dump_text)

        # Execute dump2dcm
        cmd = ["dump2dcm", dump_temp_path, output_wl_path]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            logger.error(f"dump2dcm falhou ao gerar {output_wl_path}: {res.stderr}")
            return False

        return True
    except FileNotFoundError:
        logger.error(
            "Utilitário 'dump2dcm' do DCMTK não encontrado no PATH do sistema. "
            "Instale o pacote dcmtk no servidor local."
        )
        return False
    except Exception as e:
        logger.error(f"Erro ao compilar arquivo .wl: {e}")
        return False
    finally:
        if os.path.exists(dump_temp_path):
            try:
                os.remove(dump_temp_path)
            except OSError:
                pass


def sync_worklist(base_url: str, token: str, clinic: str, worklist_dir: str):
    """
    Realiza uma consulta na nuvem e atualiza a pasta de worklists do Orthanc.
    """
    endpoint = f"{base_url.rstrip('/')}/backend/v1/mwl/appointments"
    headers = {"Authorization": f"Bearer {token}"}
    params = {}
    if clinic:
        params["clinic"] = clinic

    logger.info(f"Consultando nuvem ({endpoint}) para unidade '{clinic or 'Geral'}'...")

    try:
        resp = requests.get(endpoint, headers=headers, params=params, timeout=15)
        if resp.status_code == 401 or resp.status_code == 403:
            logger.error(f"Falha de autenticação ({resp.status_code}): verifique o token MWL do médico.")
            return
        if resp.status_code != 200:
            logger.error(f"Erro HTTP {resp.status_code} na consulta: {resp.text}")
            return

        data = resp.json()
        items: List[Dict[str, Any]] = data.get("items", [])
        logger.info(f"Recebidos {len(items)} agendamento(s) para sincronização.")

        os.makedirs(worklist_dir, exist_ok=True)
        active_accessions = set()

        for appt in items:
            accession = appt.get("accessionNumber")
            if not accession:
                continue
            active_accessions.add(accession)

            wl_filename = f"{accession}.wl"
            wl_filepath = os.path.join(worklist_dir, wl_filename)

            dump_content = generate_dcmtk_dump(appt)
            success = compile_dump_to_wl(dump_content, wl_filepath)
            if success:
                logger.info(f"Worklist gerada: {wl_filename} -> {appt.get('dicom', {}).get('PatientName')}")

        # Limpar arquivos .wl antigos que foram cancelados ou concluídos no sistema
        for fname in os.listdir(worklist_dir):
            if fname.endswith(".wl"):
                acc = fname[:-3]
                if acc not in active_accessions:
                    try:
                        os.remove(os.path.join(worklist_dir, fname))
                        logger.info(f"Removido agendamento não ativo da worklist: {fname}")
                    except OSError:
                        pass

    except requests.exceptions.RequestException as e:
        logger.warning(f"Falha de conexão com a nuvem (tentará novamente no próximo ciclo): {e}")
    except Exception as e:
        logger.error(f"Erro inesperado no ciclo de sincronização: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Agente Local de Ponte DICOM Modality Worklist (MWL) - LW Laudos"
    )
    parser.add_argument("--url", required=True, help="URL base do LW Laudos na nuvem (ex: https://app.meudominio.com)")
    parser.add_argument("--token", required=True, help="Token MWL individual do médico gerado em Configurações")
    parser.add_argument("--clinic", default="", help="Nome da clínica/unidade para filtro (ex: Gastroimagem)")
    parser.add_argument(
        "--worklist-dir",
        default="./orthanc_worklists",
        help="Diretório vigiado pelo plugin Worklists do Orthanc (onde os .wl são gravados)",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=60,
        help="Intervalo de polling incremental em segundos (padrão: 60s)",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Executa uma única sincronização e encerra (ideal para crontab)",
    )

    args = parser.parse_args()

    logger.info("=== Iniciando LW Laudos MWL Bridge ===")
    logger.info(f"Nuvem: {args.url}")
    logger.info(f"Clínica: {args.clinic or 'Todas'}")
    logger.info(f"Pasta Worklist Orthanc: {args.worklist_dir}")
    logger.info(f"Intervalo: {args.interval}s")

    if args.once:
        sync_worklist(args.url, args.token, args.clinic, args.worklist_dir)
        return

    try:
        while True:
            sync_worklist(args.url, args.token, args.clinic, args.worklist_dir)
            time.sleep(args.interval)
    except KeyboardInterrupt:
        logger.info("Ponte MWL encerrada pelo operador.")


if __name__ == "__main__":
    main()
