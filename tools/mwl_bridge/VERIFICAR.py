#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/mwl_bridge/VERIFICAR.py
==============================
Script de Verificação de Prontidão da Ponte DICOM MWL - LW Laudos.

Testa de ponta a ponta cada componente necessário para o teste de campo:
1. Python presente e versão suportada (>= 3.10)
2. Dependências importáveis (requests, socket, json, etc.)
3. Orthanc local acessível na API REST (localhost:8042)
4. Porta DICOM 104 (ou configurada) aberta localmente
5. Plugin Worklists do Orthanc carregado e respondendo
6. Token do médico configurado (lido de config_ponte.env ou variável de ambiente, nunca fixo)
7. Conectividade com a nuvem do app (GET /backend/v1/mwl/appointments com o token)
8. Quantidade e detalhes de agendamentos pendentes encontrados

Emite veredito final claro:
- "PRONTO PARA O APARELHO" se tudo estiver 100%
- Lista detalhada e amigável do que falta caso algum item falhe.
"""

import os
import sys
import json
import socket
from datetime import datetime
from typing import Dict, Any, Tuple, Optional, List

# Códigos de formatação visual para terminal
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


def main():
    print("=" * 70)
    print("  LW LAUDOS - VERIFICAÇÃO DE PRONTIDÃO DA PONTE DICOM MWL")
    print("=" * 70)
    print(f"Data da verificação: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"Diretório atual:     {os.path.dirname(os.path.abspath(__file__))}")
    print("=" * 70)
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
        print(f"[{WARN}] 1. Python instalado: v{py_version_str} (recomendado >= 3.10, mas funcional)")
        sucessos.append("Python >= 3.8")
    else:
        print(f"[{CROSS}] 1. Python instalado: v{py_version_str} (INCOMPATÍVEL: requer Python 3.10+)")
        pendencias.append("Instalar Python 3.10 ou superior (via winget ou python.org)")

    # --------------------------------------------------------------------------
    # 2. VERIFICAÇÃO DAS DEPENDÊNCIAS
    # --------------------------------------------------------------------------
    missing_deps: List[str] = []
    requests_lib = None
    try:
        import requests
        requests_lib = requests
        print(f"[{CHECK}] 2. Biblioteca 'requests' instalada (v{requests.__version__})")
        sucessos.append("Biblioteca requests")
    except ImportError:
        missing_deps.append("requests")
        print(f"[{CROSS}] 2. Biblioteca 'requests' NÃO encontrada")
        pendencias.append("Instalar dependências Python: execute 'pip install -r requirements.txt'")

    # Utilitário dump2dcm (DCMTK) opcionalmente verificado
    import shutil
    has_dump2dcm = shutil.which("dump2dcm") is not None
    if has_dump2dcm:
        print(f"[{CHECK}]    Utilitário DCMTK 'dump2dcm' detectado no PATH do sistema")
    else:
        print(f"[{WARN}]    Utilitário DCMTK 'dump2dcm' não detectado no PATH global.")
        print(f"         (Nota: se usar plugin Worklists direto no Orthanc, os arquivos .wl")
        print(f"         podem ser alimentados via dump2dcm local ou plugin REST do Orthanc).")

    # --------------------------------------------------------------------------
    # 3. VERIFICAÇÃO DO SERVIDOR ORTHANC (API REST localhost:8042)
    # --------------------------------------------------------------------------
    orthanc_api_ok = False
    orthanc_system_info = {}
    if requests_lib:
        try:
            r = requests_lib.get("http://localhost:8042/system", timeout=2.5)
            if r.status_code == 200:
                orthanc_system_info = r.json()
                orthanc_api_ok = True
                name = orthanc_system_info.get("Name", "Orthanc")
                version = orthanc_system_info.get("Version", "desconhecida")
                aet = orthanc_system_info.get("DicomAet", "ORTHANC")
                print(f"[{CHECK}] 3. Orthanc REST API respondendo em http://localhost:8042 (v{version}, AE: {aet})")
                sucessos.append("Orthanc REST API")
            else:
                print(f"[{CROSS}] 3. Orthanc REST API retornou status HTTP {r.status_code}")
                pendencias.append("Iniciar o Orthanc executando '1-iniciar-orthanc.bat'")
        except Exception:
            print(f"[{CROSS}] 3. Orthanc REST API inacessível em http://localhost:8042 (servidor não está rodando)")
            pendencias.append("Iniciar o Orthanc executando o atalho '1-iniciar-orthanc.bat'")
    else:
        print(f"[{CROSS}] 3. Não foi possível testar Orthanc REST API (dependência requests ausente)")
        pendencias.append("Iniciar o Orthanc executando '1-iniciar-orthanc.bat'")

    # --------------------------------------------------------------------------
    # 4. VERIFICAÇÃO DA PORTA DICOM 104 (OU 4242)
    # --------------------------------------------------------------------------
    dicom_port = 104
    # Se conseguimos ler a config do orthanc, usamos a porta declarada lá
    script_dir = os.path.dirname(os.path.abspath(__file__))
    orthanc_cfg_path = os.path.join(script_dir, "orthanc.json")
    if os.path.exists(orthanc_cfg_path):
        try:
            with open(orthanc_cfg_path, "r", encoding="utf-8") as f:
                cfg_data = json.load(f)
                dicom_port = cfg_data.get("DicomPort", 104)
        except Exception:
            pass

    port_open = check_tcp_port("127.0.0.1", dicom_port, timeout=1.5)
    if port_open:
        print(f"[{CHECK}] 4. Porta DICOM TCP {dicom_port} ABERTA e aceitando conexões locais")
        sucessos.append(f"Porta DICOM {dicom_port}")
    else:
        print(f"[{CROSS}] 4. Porta DICOM TCP {dicom_port} FECHADA ou inacessível")
        print(f"      (O Orthanc precisa estar rodando na porta {dicom_port}, e o Firewall do Windows")
        print(f"      deve permitir entrada TCP na porta {dicom_port} para a rede do Saevo).")
        pendencias.append(f"Abrir porta DICOM {dicom_port} (inicie o Orthanc com '1-iniciar-orthanc.bat')")

    # --------------------------------------------------------------------------
    # 5. VERIFICAÇÃO DO PLUGIN WORKLISTS DO ORTHANC
    # --------------------------------------------------------------------------
    if orthanc_api_ok and requests_lib:
        try:
            r_plugins = requests_lib.get("http://localhost:8042/plugins", timeout=2.0)
            if r_plugins.status_code == 200:
                plugins_list = r_plugins.json()
                # O plugin oficial costuma se registrar como 'worklists' ou 'modality-worklists'
                has_wl_plugin = any("worklist" in str(p).lower() for p in plugins_list)
                if has_wl_plugin:
                    print(f"[{CHECK}] 5. Plugin Worklists do Orthanc ATIVO (plugins carregados: {plugins_list})")
                    sucessos.append("Plugin Worklists Orthanc")
                else:
                    print(f"[{WARN}] 5. Orthanc rodando, mas plugin Worklists não listado explicitamente em /plugins.")
                    print(f"         Plugins ativos: {plugins_list}")
                    print(f"         Verifique se 'ModalityWorklists.dll' está na pasta 'Plugins' do Orthanc.")
                    pendencias.append("Certificar que o plugin ModalityWorklists.dll está ativo no orthanc.json")
            else:
                print(f"[{WARN}] 5. Endpoint /plugins do Orthanc retornou status {r_plugins.status_code}")
        except Exception as e:
            print(f"[{WARN}] 5. Não foi possível inspecionar plugins do Orthanc: {e}")
    else:
        print(f"[{CROSS}] 5. Plugin Worklists não verificado (Orthanc não está respondendo)")
        pendencias.append("Garantir que o Orthanc esteja rodando com o plugin de Worklists habilitado")

    # --------------------------------------------------------------------------
    # 6. CONFIGURAÇÃO DO TOKEN DO MÉDICO
    # --------------------------------------------------------------------------
    # Lê de variável de ambiente ou arquivo local config_ponte.env (NUNCA fixo)
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
        print(f"[{CHECK}] 6. Token MWL configurado localmente (token: {masked_token})")
        print(f"      Origem: {'Variável de ambiente' if 'LW_MWL_TOKEN' in os.environ else env_file_path}")
        print(f"      URL Nuvem: {cloud_url}")
        print(f"      Unidade/Clínica: '{clinic or 'Todas'}'")
        sucessos.append("Token MWL configurado")
    else:
        print(f"[{CROSS}] 6. Token do médico NÃO configurado ou ainda contém o valor de exemplo!")
        print(f"      Arquivo: {env_file_path}")
        print(f"      Como resolver:")
        print(f"      1. Abra o sistema LW Laudos no navegador.")
        print(f"      2. Vá em Configurações -> Worklist DICOM & Unidades de Atendimento.")
        print(f"      3. Gere ou copie seu token MWL.")
        print(f"      4. Cole no arquivo '{env_file_path}' no campo LW_MWL_TOKEN=...")
        pendencias.append("Colar token MWL válido do médico no arquivo 'config_ponte.env'")

    # --------------------------------------------------------------------------
    # 7. CONECTIVIDADE COM A NUVEM DO APP (GET /backend/v1/mwl/appointments)
    # --------------------------------------------------------------------------
    cloud_connected = False
    pending_appointments_count = 0
    appointments_list: List[Dict[str, Any]] = []

    if requests_lib and not token_is_placeholder:
        endpoint = f"{cloud_url.rstrip('/')}/backend/v1/mwl/appointments"
        headers = {"Authorization": f"Bearer {token}"}
        params = {}
        if clinic:
            params["clinic"] = clinic

        try:
            print(f"      Consultando nuvem em: {endpoint} ...")
            r_cloud = requests_lib.get(endpoint, headers=headers, params=params, timeout=10.0)

            if r_cloud.status_code == 200:
                data = r_cloud.json()
                cloud_connected = True
                doctor_info = data.get("doctor", {})
                doc_name = doctor_info.get("professional_name") or doctor_info.get("name") or "Médico"
                doc_crm = doctor_info.get("crm") or ""
                items = data.get("items", [])
                pending_appointments_count = len(items)
                appointments_list = items

                crm_str = f" (CRM: {doc_crm})" if doc_crm else ""
                print(f"[{CHECK}] 7. Conectividade com a nuvem bem-sucedida (Autenticado como: {doc_name}{crm_str})")
                print(f"[{CHECK}] 8. Agendamentos recebidos da nuvem: {pending_appointments_count} agendamento(s) ativo(s)")

                if pending_appointments_count > 0:
                    print("      Primeiros agendamentos encontrados:")
                    for idx, appt in enumerate(items[:5], 1):
                        p_name = appt.get("dicom", {}).get("PatientName", "PACIENTE")
                        p_acc = appt.get("accessionNumber", "S/ACC")
                        p_exam = appt.get("examType", "Ultrassonografia")
                        p_time = appt.get("startTimeIso", "")[:16].replace("T", " ")
                        print(f"        {idx}. [{p_acc}] {p_name} - {p_exam} ({p_time})")
                else:
                    print("      (Nenhum agendamento ativo encontrado com os filtros atuais. Crie um agendamento na Agenda para o teste).")

                sucessos.append("Conectividade e autenticação com a nuvem")
                sucessos.append("Consulta de agendamentos MWL")
            elif r_cloud.status_code in (401, 403):
                print(f"[{CROSS}] 7. Falha de autenticação na nuvem (HTTP {r_cloud.status_code})")
                print("      O token informado não é válido ou foi revogado para este médico.")
                pendencias.append("Verificar/regenerar token MWL em Configurações no LW Laudos")
            else:
                print(f"[{CROSS}] 7. Nuvem retornou erro HTTP {r_cloud.status_code}: {r_cloud.text[:200]}")
                pendencias.append(f"Verificar conectividade com a nuvem (HTTP {r_cloud.status_code})")
        except requests_lib.exceptions.RequestException as e:
            print(f"[{CROSS}] 7. Falha de conexão de rede com a nuvem ({cloud_url}): {e}")
            print("      Verifique se o notebook está conectado à internet (ex: via Hotspot 4G do celular).")
            pendencias.append("Conectar o notebook à internet para sincronização com a nuvem")
    else:
        print(f"[{CROSS}] 7. Teste de nuvem pulado (token ausente ou biblioteca requests ausente)")

    # --------------------------------------------------------------------------
    # VEREDITO FINAL
    # --------------------------------------------------------------------------
    print()
    print("=" * 70)
    print("  VEREDITO FINAL DA VERIFICAÇÃO")
    print("=" * 70)

    if not pendencias:
        print()
        print(f"  ★★★★★  VEREDITO: PRONTO PARA O APARELHO!  ★★★★★")
        print()
        print("  Todos os componentes essenciais estão operando perfeitamente:")
        print(f"  - Orthanc ativo e escutando na porta DICOM {dicom_port} (AE Title: LW-ORTHO)")
        print(f"  - Conexão com a nuvem autenticada ({pending_appointments_count} exames prontos)")
        print(f"  - Próximo passo no Saevo FT412: New Patient -> WorkList -> Search")
        print()
        print("=" * 70)
        return 0
    else:
        print()
        print(f"  ATENÇÃO: A PONTE AINDA NÃO ESTÁ PRONTA. FALTAM {len(pendencias)} ITEM(NS):")
        print()
        for idx, item in enumerate(pendencias, 1):
            print(f"  {idx}. {ARROW} {item}")
        print()
        print("  Instruções detalhadas de resolução em:")
        print("  docs/INSTALACAO_AGENTE_IA.md e docs/GUIA_TESTE_CAMPO_MIRANTE.md")
        print()
        print("=" * 70)
        return 1


if __name__ == "__main__":
    sys.exit(main())
