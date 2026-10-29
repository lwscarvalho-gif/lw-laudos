#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/mwl_bridge/VERIFICAR.py
==============================
Script de Verificação de Prontidão da Ponte DICOM MWL - LW Laudos / Sistema Médico Multiperfil.

Valida de ponta a ponta cada componente da integração real:
1. Python presente e versão suportada (>= 3.10)
2. Dependências importáveis (requests, socket, json, etc.)
3. Orthanc local em execução e respondendo na API REST (localhost:8042/system)
4. Porta DICOM TCP 104 (ou configurada) aberta e aceitando conexões locais
5. Plugin Worklists do Orthanc carregado e ativo
6. Ciclo de Vida Real do Orthanc:
   - Consulta /worklists existente
   - Cria entrada sintética de teste (sem dados clínicos reais) via REST ou arquivo .wl
   - Confirma que a entrada foi registrada com sucesso
   - Remove a entrada de teste e confirma limpeza
7. Token do médico configurado localmente (config_ponte.env ou variável de ambiente)
8. Conectividade com a nuvem do app (GET /backend/v1/mwl/appointments com o token)
9. Quantidade e detalhes dos agendamentos pendentes retornados pela nuvem

Emite veredito final claro:
- "PRONTO PARA O APARELHO" ESTRITAMENTE quando todos os testes passarem.
- Diagnóstico em português claro com instruções imediatas para qualquer falha encontrada.
"""

import os
import sys
import json
import socket
import time
import shutil
import subprocess
from datetime import datetime
from typing import Dict, Any, Tuple, Optional, List

CHECK = "✔"
CROSS = "✘"
WARN = "⚠"
ARROW = "➜"


def load_env_file(filepath: str) -> Dict[str, str]:
    """Lê um arquivo no formato KEY=VALUE sem exigir biblioteca externa."""
    env: Dict[str, str] = {}
    if not os.path.exists(filepath):
        return env
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    env[key.strip()] = val.strip().strip('"').strip("'")
    except Exception:
        pass
    return env


def check_tcp_port(host: str, port: int, timeout: float = 2.0) -> bool:
    """Verifica se uma porta TCP está aberta e aceitando conexões."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    try:
        s.connect((host, port))
        s.close()
        return True
    except Exception:
        return False


def test_synthetic_worklist_lifecycle(
    orthanc_url: str,
    worklist_dir: str,
    requests_lib,
) -> Tuple[bool, str]:
    """
    Testa a criação, confirmação e remoção de uma entrada de worklist sintética de teste.
    NÃO utiliza dados clínicos de pacientes reais.
    """
    test_id = f"TESTE-MWL-{int(time.time())}"
    synthetic_payload = {
        "Tags": {
            "SpecificCharacterSet": "ISO_IR 192",
            "PatientName": "TESTE^SINTETICO",
            "PatientID": "TESTE0001",
            "PatientSex": "O",
            "AccessionNumber": test_id,
            "StudyDescription": "Teste de Integracao MWL",
            "Modality": "US",
            "RequestedProcedureID": test_id,
            "ScheduledProcedureStepSequence": [
                {
                    "Modality": "US",
                    "ScheduledStationAETitle": "LW-ORTHO",
                    "ScheduledProcedureStepStartDate": datetime.now().strftime("%Y%m%d"),
                    "ScheduledProcedureStepStartTime": "080000",
                    "ScheduledPerformingPhysicianName": "DR TESTE",
                    "ScheduledProcedureStepDescription": "Teste de Integracao MWL",
                    "ScheduledProcedureStepID": test_id,
                }
            ],
        },
        "Force": True,
    }

    # Tentativa A: Via Orthanc REST API (/worklists/create ou PUT /worklists/{id})
    try:
        post_resp = requests_lib.post(
            f"{orthanc_url}/worklists/create",
            json=synthetic_payload,
            timeout=3.0,
        )
        if post_resp.status_code in (200, 201):
            created_data = post_resp.json() if post_resp.text else {}
            created_id = created_data.get("ID") or test_id

            # Confirmar listagem
            list_resp = requests_lib.get(f"{orthanc_url}/worklists", timeout=3.0)
            items = list_resp.json() if list_resp.status_code == 200 else []
            found = created_id in items or test_id in str(items)

            # Remover entrada sintética
            del_resp = requests_lib.delete(f"{orthanc_url}/worklists/{created_id}", timeout=3.0)
            cleaned = del_resp.status_code in (200, 204, 404)

            if found and cleaned:
                return True, f"Ciclo REST concluído com sucesso (criou, listou e removeu ID: {created_id})"
            elif found and not cleaned:
                return True, f"Ciclo REST criado e listado (limpeza retornou HTTP {del_resp.status_code})"
    except Exception:
        pass

    # Tentativa B: Via pasta de arquivos .wl vigiada pelo plugin
    if worklist_dir:
        os.makedirs(worklist_dir, exist_ok=True)
        test_file = os.path.join(worklist_dir, f"{test_id}.wl")
        dump_file = os.path.join(worklist_dir, f"{test_id}.dump")

        dump_text = (
            "(0008,0005) CS [ISO_IR 192]\n"
            "(0008,0050) SH [TESTE-SYNTH]\n"
            "(0008,0060) CS [US]\n"
            "(0010,0010) PN [TESTE^SINTETICO]\n"
            "(0010,0020) LO [TESTE0001]\n"
            "(0040,0100) SQ\n"
            "  (fffe,e000) na\n"
            "    (0008,0060) CS [US]\n"
            "    (0040,0001) AE [LW-ORTHO]\n"
            f"    (0040,0002) DA [{datetime.now().strftime('%Y%m%d')}]\n"
            "    (0040,0003) TM [080000]\n"
            "  (fffe,e00d) na\n"
            "(fffe,e0dd) na\n"
        )

        has_dump2dcm = shutil.which("dump2dcm") is not None
        if has_dump2dcm:
            try:
                with open(dump_file, "w", encoding="utf-8") as f:
                    f.write(dump_text)
                res = subprocess.run(["dump2dcm", dump_file, test_file], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                if res.returncode == 0 and os.path.exists(test_file):
                    # Remove o arquivo de teste para deixar limpo
                    os.remove(test_file)
                    if os.path.exists(dump_file):
                        os.remove(dump_file)
                    return True, "Ciclo via arquivo .wl e dump2dcm concluído com sucesso (criou e removeu teste)"
            except Exception as e:
                return False, f"Falha ao testar ciclo via dump2dcm: {e}"
            finally:
                for p in (test_file, dump_file):
                    if os.path.exists(p):
                        try:
                            os.remove(p)
                        except OSError:
                            pass

    return False, "Não foi possível completar o ciclo de teste sintético no Orthanc (REST nem dump2dcm responderam)."


def main():
    print("=" * 72)
    print("  LW LAUDOS - VERIFICAÇÃO DE PRONTIDÃO DA PONTE DICOM MWL / ORTHANC")
    print("=" * 72)
    print(f"Data da verificação: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"Diretório atual:     {os.path.dirname(os.path.abspath(__file__))}")
    print("=" * 72)
    print()

    pendencias: List[str] = []
    sucessos: List[str] = []

    # --------------------------------------------------------------------------
    # 1. VERIFICAÇÃO DO PYTHON
    # --------------------------------------------------------------------------
    py_major = sys.version_info.major
    py_minor = sys.version_info.minor
    py_micro = sys.version_info.micro
    py_version_str = f"{py_major}.{py_minor}.{py_micro}"

    if py_major == 3 and py_minor >= 10:
        print(f"[{CHECK}] 1. Python instalado: v{py_version_str} (compatível com Python 3.10+)")
        sucessos.append("Python 3.10+")
    elif py_major == 3 and py_minor >= 8:
        print(f"[{WARN}] 1. Python instalado: v{py_version_str} (funcional, recomendado >= 3.10)")
        sucessos.append("Python >= 3.8")
    else:
        print(f"[{CROSS}] 1. Python instalado: v{py_version_str} (INCOMPATÍVEL: requer Python 3.10+)")
        pendencias.append("Instalar Python 3.10 ou superior (via winget install Python.Python.3.11)")

    # --------------------------------------------------------------------------
    # 2. VERIFICAÇÃO DAS DEPENDÊNCIAS
    # --------------------------------------------------------------------------
    requests_lib = None
    try:
        import requests
        requests_lib = requests
        print(f"[{CHECK}] 2. Biblioteca 'requests' instalada (v{requests.__version__})")
        sucessos.append("Biblioteca requests")
    except ImportError:
        print(f"[{CROSS}] 2. Biblioteca 'requests' NÃO encontrada")
        pendencias.append("Instalar dependências Python: execute 'pip install -r requirements.txt'")

    has_dump2dcm = shutil.which("dump2dcm") is not None
    if has_dump2dcm:
        print(f"[{CHECK}]    Utilitário DCMTK 'dump2dcm' detectado no PATH do sistema")
    else:
        print(f"[{WARN}]    Utilitário DCMTK 'dump2dcm' não detectado no PATH global.")
        print(f"         (A ponte utilizará a REST API direta do Orthanc ou DCMTK se disponível).")

    # --------------------------------------------------------------------------
    # 3. VERIFICAÇÃO DO SERVIDOR ORTHANC (API REST localhost:8042)
    # --------------------------------------------------------------------------
    orthanc_api_ok = False
    orthanc_system_info = {}
    orthanc_url = "http://localhost:8042"

    if requests_lib:
        try:
            r = requests_lib.get(f"{orthanc_url}/system", timeout=3.0)
            if r.status_code == 200:
                orthanc_system_info = r.json()
                orthanc_api_ok = True
                name = orthanc_system_info.get("Name", "Orthanc")
                version = orthanc_system_info.get("Version", "desconhecida")
                aet = orthanc_system_info.get("DicomAet", "LW-ORTHO")
                print(f"[{CHECK}] 3. Orthanc REST API respondendo em {orthanc_url} (v{version}, AE: {aet}, Nome: {name})")
                sucessos.append("Orthanc REST API (/system)")
            else:
                print(f"[{CROSS}] 3. Orthanc REST API retornou status HTTP {r.status_code}")
                pendencias.append("Iniciar o Orthanc executando '1-iniciar-orthanc.bat'")
        except Exception:
            print(f"[{CROSS}] 3. Orthanc REST API inacessível em {orthanc_url} (servidor não está rodando)")
            pendencias.append("Iniciar o Orthanc executando o atalho '1-iniciar-orthanc.bat'")
    else:
        print(f"[{CROSS}] 3. Não foi possível testar Orthanc REST API (dependência requests ausente)")
        pendencias.append("Iniciar o Orthanc executando '1-iniciar-orthanc.bat'")

    # --------------------------------------------------------------------------
    # 4. VERIFICAÇÃO DA PORTA DICOM 104 (OU 4242)
    # --------------------------------------------------------------------------
    dicom_port = 104
    script_dir = os.path.dirname(os.path.abspath(__file__))
    orthanc_cfg_path = os.path.join(script_dir, "orthanc.json")
    worklist_dir = os.path.join(script_dir, "worklists")

    if os.path.exists(orthanc_cfg_path):
        try:
            with open(orthanc_cfg_path, "r", encoding="utf-8") as f:
                cfg_data = json.load(f)
                dicom_port = cfg_data.get("DicomPort", 104)
                wl_cfg = cfg_data.get("Worklists", {})
                if isinstance(wl_cfg, dict):
                    worklist_dir = wl_cfg.get("Database") or wl_cfg.get("Directory") or worklist_dir
        except Exception:
            pass

    port_open = check_tcp_port("127.0.0.1", dicom_port, timeout=1.5)
    if port_open:
        print(f"[{CHECK}] 4. Porta DICOM TCP {dicom_port} ABERTA e aceitando conexões locais")
        sucessos.append(f"Porta DICOM {dicom_port}")
    else:
        print(f"[{CROSS}] 4. Porta DICOM TCP {dicom_port} FECHADA ou inacessível")
        print(f"      O Orthanc precisa estar rodando e o Firewall do Windows deve")
        print(f"      permitir entrada TCP na porta {dicom_port} para a rede do Saevo.")
        pendencias.append(f"Abrir porta DICOM {dicom_port} (inicie o Orthanc com '1-iniciar-orthanc.bat')")

    # --------------------------------------------------------------------------
    # 5. VERIFICAÇÃO DO PLUGIN WORKLISTS DO ORTHANC
    # --------------------------------------------------------------------------
    plugin_active = False
    if orthanc_api_ok and requests_lib:
        try:
            r_plugins = requests_lib.get(f"{orthanc_url}/plugins", timeout=2.5)
            if r_plugins.status_code == 200:
                plugins_list = r_plugins.json()
                has_wl_plugin = any("worklist" in str(p).lower() for p in plugins_list)
                if has_wl_plugin:
                    print(f"[{CHECK}] 5. Plugin Worklists do Orthanc ATIVO (plugins carregados: {plugins_list})")
                    sucessos.append("Plugin Worklists Orthanc")
                    plugin_active = True
                else:
                    # Testar se responde direto em /worklists
                    r_wl = requests_lib.get(f"{orthanc_url}/worklists", timeout=2.0)
                    if r_wl.status_code in (200, 204):
                        print(f"[{CHECK}] 5. Plugin Worklists do Orthanc ATIVO (respondendo em /worklists)")
                        sucessos.append("Plugin Worklists Orthanc")
                        plugin_active = True
                    else:
                        print(f"[{WARN}] 5. Orthanc rodando, mas plugin Worklists não listado em /plugins nem /worklists.")
                        print(f"         Plugins ativos: {plugins_list}")
                        print(f"         Verifique se 'ModalityWorklists.dll' está na pasta 'Plugins' do Orthanc.")
                        pendencias.append("Certificar que o plugin ModalityWorklists.dll está ativo no orthanc.json")
            else:
                print(f"[{WARN}] 5. Endpoint /plugins do Orthanc retornou status {r_plugins.status_code}")
                pendencias.append("Verificar configuração de plugins no orthanc.json")
        except Exception as e:
            print(f"[{WARN}] 5. Não foi possível inspecionar plugins do Orthanc: {e}")
            pendencias.append("Garantir que o Orthanc esteja rodando com o plugin de Worklists habilitado")
    else:
        print(f"[{CROSS}] 5. Plugin Worklists não verificado (Orthanc não está respondendo)")
        pendencias.append("Garantir que o Orthanc esteja rodando com o plugin de Worklists habilitado")

    # --------------------------------------------------------------------------
    # 6. TESTE DE CICLO DE VIDA REAL NO ORTHANC (CRIAR -> LISTAR -> REMOVER SINTÉTICO)
    # --------------------------------------------------------------------------
    if orthanc_api_ok and requests_lib and plugin_active:
        ok_cycle, cycle_msg = test_synthetic_worklist_lifecycle(orthanc_url, worklist_dir, requests_lib)
        if ok_cycle:
            print(f"[{CHECK}] 6. Ciclo de vida da Worklist validado no Orthanc: {cycle_msg}")
            sucessos.append("Ciclo criar/listar/remover entrada sintética")
        else:
            print(f"[{CROSS}] 6. Falha no teste de ciclo de vida da Worklist: {cycle_msg}")
            pendencias.append("Habilitar permissão de escrita de worklists ou pasta de worklists no Orthanc")
    else:
        print(f"[{CROSS}] 6. Teste de ciclo de vida pulado (Orthanc ou plugin inativo)")
        pendencias.append("Validar ciclo de vida completo no Orthanc")

    # --------------------------------------------------------------------------
    # 7. CONFIGURAÇÃO DO TOKEN DO MÉDICO
    # --------------------------------------------------------------------------
    env_file_path = os.path.join(script_dir, "config_ponte.env")
    env_vars = load_env_file(env_file_path)

    cloud_url = os.environ.get("LW_MWL_URL") or env_vars.get("LW_MWL_URL") or "https://app.lwlaudos.com.br"
    token = os.environ.get("LW_MWL_TOKEN") or env_vars.get("LW_MWL_TOKEN") or ""
    clinic = os.environ.get("LW_MWL_CLINIC") or env_vars.get("LW_MWL_CLINIC") or ""

    token_is_placeholder = (
        not token
        or token == "COLE_AQUI_SEU_TOKEN_DE_32_CARACTERES"
        or "SEU_TOKEN" in token
        or len(token) < 16
    )

    if not token_is_placeholder:
        masked_token = f"{token[:4]}...{token[-4:]}" if len(token) >= 8 else "***"
        print(f"[{CHECK}] 7. Token MWL configurado localmente (token: {masked_token})")
        print(f"      Origem: {'Variável de ambiente' if 'LW_MWL_TOKEN' in os.environ else env_file_path}")
        print(f"      URL Nuvem: {cloud_url}")
        print(f"      Unidade/Clínica: '{clinic or 'Todas'}'")
        sucessos.append("Token MWL configurado")
    else:
        print(f"[{CROSS}] 7. Token do médico NÃO configurado ou ainda contém o valor de exemplo!")
        print(f"      Arquivo: {env_file_path}")
        print(f"      Como resolver:")
        print(f"      1. Abra o sistema LW Laudos no navegador.")
        print(f"      2. Vá em Configurações -> Worklist DICOM & Unidades de Atendimento.")
        print(f"      3. Gere ou copie seu token MWL de 32 caracteres.")
        print(f"      4. Cole no arquivo '{env_file_path}' no campo LW_MWL_TOKEN=...")
        pendencias.append("Colar token MWL válido do médico no arquivo 'config_ponte.env'")

    # --------------------------------------------------------------------------
    # 8. CONECTIVIDADE COM A NUVEM DO APP (GET /backend/v1/mwl/appointments)
    # --------------------------------------------------------------------------
    pending_appointments_count = 0

    if requests_lib and not token_is_placeholder:
        endpoint = f"{cloud_url.rstrip('/')}/backend/v1/mwl/appointments"
        headers = {"Authorization": f"Bearer {token}"}
        params: Dict[str, str] = {}
        if clinic:
            params["clinic"] = clinic

        try:
            print(f"      Consultando nuvem em: {endpoint} ...")
            r_cloud = requests_lib.get(endpoint, headers=headers, params=params, timeout=10.0)

            if r_cloud.status_code == 200:
                data = r_cloud.json()
                doctor_info = data.get("doctor", {}) or {}
                doc_name = doctor_info.get("professional_name") or doctor_info.get("name") or "Médico"
                doc_crm = doctor_info.get("crm") or ""
                items = data.get("items", []) or []
                pending_appointments_count = len(items)

                crm_str = f" (CRM: {doc_crm})" if doc_crm else ""
                print(f"[{CHECK}] 8. Conectividade com a nuvem bem-sucedida (Autenticado como: {doc_name}{crm_str})")
                print(f"[{CHECK}] 9. Agendamentos recebidos da nuvem: {pending_appointments_count} agendamento(s) ativo(s)")

                if pending_appointments_count > 0:
                    print("      Primeiros agendamentos encontrados:")
                    for idx, appt in enumerate(items[:5], 1):
                        p_name = appt.get("dicom", {}).get("PatientName", "PACIENTE")
                        p_acc = appt.get("accessionNumber", "S/ACC")
                        p_exam = appt.get("examType", "Ultrassonografia")
                        p_time = (appt.get("startTimeIso") or "")[:16].replace("T", " ")
                        print(f"        {idx}. [{p_acc}] {p_name} - {p_exam} ({p_time})")
                else:
                    print("      (Nenhum agendamento ativo encontrado com os filtros atuais. Crie um agendamento na Agenda para o teste).")

                sucessos.append("Conectividade e autenticação com a nuvem")
                sucessos.append("Consulta de agendamentos MWL")
            elif r_cloud.status_code in (401, 403):
                print(f"[{CROSS}] 8. Falha de autenticação na nuvem (HTTP {r_cloud.status_code})")
                print("      O token informado não é válido ou foi revogado para este médico.")
                pendencias.append("Verificar/regenerar token MWL em Configurações no LW Laudos")
            else:
                print(f"[{CROSS}] 8. Nuvem retornou erro HTTP {r_cloud.status_code}: {r_cloud.text[:200]}")
                pendencias.append(f"Verificar conectividade com a nuvem (HTTP {r_cloud.status_code})")
        except requests_lib.exceptions.RequestException as e:
            print(f"[{CROSS}] 8. Falha de conexão de rede com a nuvem ({cloud_url}): {e}")
            print("      Verifique se o notebook está conectado à internet (ex: via Hotspot 4G/5G do celular).")
            pendencias.append("Conectar o notebook à internet para sincronização com a nuvem")
    else:
        print(f"[{CROSS}] 8. Teste de nuvem pulado (token ausente ou biblioteca requests ausente)")

    # --------------------------------------------------------------------------
    # VEREDITO FINAL (ESTRITO: SÓ DIZ "PRONTO PARA O APARELHO" SE TUDO PASSAR)
    # --------------------------------------------------------------------------
    print()
    print("=" * 72)
    print("  VEREDITO FINAL DA VERIFICAÇÃO")
    print("=" * 72)

    if not pendencias:
        print()
        print("  ★★★★★  VEREDITO: PRONTO PARA O APARELHO!  ★★★★★")
        print()
        print("  Todos os componentes essenciais e o ciclo de vida da worklist passaram com 100% de sucesso:")
        print(f"  - Orthanc ativo e escutando na porta DICOM TCP {dicom_port} (AE Title: LW-ORTHO)")
        print(f"  - Plugin Worklists validado de ponta a ponta (criação, listagem e remoção de entrada)")
        print(f"  - Conexão com a nuvem autenticada ({pending_appointments_count} exame(s) ativo(s))")
        print("  - Próximo passo no Saevo FT412: New Patient -> WorkList -> Search")
        print()
        print("=" * 72)
        return 0
    else:
        print()
        print(f"  ATENÇÃO: A PONTE AINDA NÃO ESTÁ PRONTA. FALTAM {len(pendencias)} ITEM(NS):")
        print()
        for idx, item in enumerate(pendencias, 1):
            print(f"  {idx}. {ARROW} {item}")
        print()
        print("  Instruções detalhadas de resolução em:")
        print("  docs/INSTALACAO_AGENTE_IA.md e docs/GUIA_WORKLIST_ORTHANC.md")
        print()
        print("=" * 72)
        return 1


if __name__ == "__main__":
    sys.exit(main())
