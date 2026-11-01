/\*\*

- MATRIZ DE COBERTURA CLÍNICA DE PROCEDIMENTOS E MÁSCARAS
- LW Laudos - v0.0.62
-
- Estados de Revisão Clínica:
- - ESTRUTURADA E TESTADA
- - ESTRUTURADA AGUARDANDO REVISÃO CLÍNICA
- - PARCIAL
- - TEXTO LIVRE SEGURO
- - BLOQUEADA
-
- Regra: O status "homologada clinicamente" NUNCA é atribuído automaticamente apenas por testes passarem.
  \*/

# MATRIZ DE COBERTURA CLÍNICA — LW LAUDOS

| Código               | Procedimento                                         | Categoria          | Máscara Associada    | Versão | Nº Seções | Normalidade Específica             | Biblioteca de Frases                | Editor Estruturado | PDF Testado | Status da Revisão Clínica | Pendências / Próximos Passos                  |
| :------------------- | :--------------------------------------------------- | :----------------- | :------------------- | :----- | :-------- | :--------------------------------- | :---------------------------------- | :----------------- | :---------- | :------------------------ | :-------------------------------------------- |
| **USG-ABD-01**       | Ultrassonografia de Abdome Total                     | Abdome             | US-MASK-ABD-01       | 1.0.0  | 10        | Sim (3 Níveis)                     | Sim (Esteatose, Colelitíase, etc.)  | Sim                | Sim         | **ESTRUTURADA E TESTADA** | Homologação médica em uso clínico diário      |
| **USG-PROST-01**     | Ultrassonografia de Próstata via Abdominal           | Geniturinário      | US-MASK-PROST-ABD-01 | 1.0.0  | 6         | Sim (Bexiga/Próstata/Resíduo)      | Sim (HBP, Resíduo)                  | Sim                | Sim         | **ESTRUTURADA E TESTADA** | Validação em pacientes pós-prostatectomia     |
| **USG-PROST-02**     | Ultrassonografia de Próstata Transretal              | Geniturinário      | US-MASK-PROST-TR-01  | 1.0.0  | 4         | Sim (Cápsula/Zonas/Vesículas)      | Sim (Nódulos periféricos)           | Sim                | Sim         | **ESTRUTURADA E TESTADA** | Adição de mapa esquemático setorial futuro    |
| **USG-REN-01**       | Ultrassonografia de Rins e Vias Urinárias            | Geniturinário      | US-MASK-REN-01       | 1.0.0  | 4         | Sim (Rim D, Rim E, Bexiga)         | Sim (Cálculo, Cisto, Ectasia)       | Sim                | Sim         | **ESTRUTURADA E TESTADA** | Validação de jatos ureterais com Doppler      |
| **USG-TIR-01**       | Ultrassonografia de Tireoide com Doppler             | Cervical           | US-MASK-TIR-01       | 1.0.0  | 6         | Sim (Lobos D/E, Istmo, Doppler)    | Sim (Nódulos, Tireoidite)           | Sim                | Sim         | **ESTRUTURADA E TESTADA** | Calculadora interativa ACR TI-RADS completa   |
| **USG-MAM-01**       | Ultrassonografia Mamária Bilateral                   | Mamas              | US-MASK-MAM-01       | 1.0.0  | 3         | Sim (Mamas D/E, Axilas)            | Sim (Cistos, Fibroadenoma)          | Sim                | Sim         | **ESTRUTURADA E TESTADA** | Integração total ao Body Mark mamário SVG     |
| **USG-TV-01**        | Ultrassonografia Pélvica Ginecológica / Transvaginal | Ginecologia        | US-MASK-TV-01        | 1.0.0  | 5         | Sim (Útero, Endométrio, Ovários)   | Sim (Miomas, Adenomiose, Cistos)    | Sim                | Sim         | **ESTRUTURADA E TESTADA** | Correlação com fase do ciclo e IOTA simples   |
| **USG-OBS-01**       | Ultrassonografia Obstétrica Inicial / 1º Tri         | Obstetrícia        | US-MASK-OBS-1TRI-01  | 1.0.0  | 4         | Sim (Saco, Embrião, CCN, FCF)      | Sim (Descolamento, Hematoma)        | Sim                | Sim         | **ESTRUTURADA E TESTADA** | Curvas de referência de CCN automáticas       |
| **USG-OBS-02**       | Ultrassonografia Obstétrica Básica                   | Obstetrícia        | US-MASK-OBS-BAS-01   | 1.0.0  | 4         | Sim (Biometria, Placenta, ILA)     | Sim (Apresentação, Placenta)        | Sim                | Sim         | **ESTRUTURADA E TESTADA** | Fórmulas de Hadlock integradas                |
| **USG-OBS-03**       | Ultrassonografia Obstétrica Morfológica 2º Tri       | Obstetrícia        | US-MASK-OBS-MORF2-01 | 1.0.0  | 8         | Sim (SNC, Face, Coração, Membros)  | Sim (Anomalias frequentes)          | Sim                | Sim         | **ESTRUTURADA E TESTADA** | Checklists ISUOG de 20 a 24 semanas           |
| **USG-DOPP-CAR-01**  | Doppler de Carótidas e Vertebrais                    | Vascular           | US-MASK-DOPP-CAR-01  | 1.0.0  | 3         | Sim (Carótidas D/E, Vertebrais)    | Sim (Placas, Estenoses)             | Sim                | Sim         | **ESTRUTURADA E TESTADA** | Critérios NASCET/ECST automáticos             |
| **USG-DOPP-REN-01**  | Doppler das Artérias Renais                          | Vascular           | US-MASK-DOPP-REN-01  | 1.0.0  | 4         | Sim (Óstios, Aorta, IR Renal)      | Sim (Estenose, Tardus-parvus)       | Sim                | Sim         | **ESTRUTURADA E TESTADA** | Índices de velocidade renal/aórtica (RAR)     |
| **USG-ESCROT-01**    | Ultrassonografia da Bolsa Escrotal com Doppler       | Geniturinário      | US-MASK-ESCROT-01    | 1.0.0  | 5         | Sim (Testículos D/E, Doppler)      | Sim (Varicocele, Cistos)            | Sim                | Sim         | **ESTRUTURADA E TESTADA** | Protocolo de Valsalva dinâmico                |
| **USG-ART-OMB-01**   | Ultrassonografia Articular de Ombro                  | Musculoesquelético | US-MASK-ART-OMB-01   | 1.0.0  | 6         | Sim (Manguito Rotador, Bursa)      | Sim (Tendinopatia, Rotura, Bursite) | Sim                | Sim         | **ESTRUTURADA E TESTADA** | Variação paramétrica por lateralidade D/E     |
| **USG-ART-JOE-01**   | Ultrassonografia Articular de Joelho                 | Musculoesquelético | US-MASK-ART-JOE-01   | 1.0.0  | 5         | Sim (Extensor, Meniscos, Fossa)    | Sim (Derrame, Cisto de Baker)       | Sim                | Sim         | **ESTRUTURADA E TESTADA** | Variação paramétrica por lateralidade D/E     |
| **USG-PM-01**        | Ultrassonografia de Partes Moles                     | Partes Moles       | US-MASK-PM-01        | 1.0.0  | 3         | Sim (Subcutâneo, Fáscias, Doppler) | Sim (Lipoma, Coleções)              | Sim                | Sim         | **ESTRUTURADA E TESTADA** | Classificação ecográfica de coleções líquidas |
| **USG-DOPP-VEN-01**  | Doppler Venoso de Membros Inferiores                 | Vascular           | Fallback Seguro      | -      | 0         | Não (Desabilitado)                 | Sim                                 | Não                | Sim         | **TEXTO LIVRE SEGURO**    | Criação de máscara de refluxo/TVP na 1.0      |
| **USG-ART-DIVERSAS** | Articulações (Cotovelo, Punho, Mão, Tornozelo, Pé)   | Musculoesquelético | Fallback Seguro      | -      | 0         | Não (Desabilitado)                 | Sim                                 | Não                | Sim         | **TEXTO LIVRE SEGURO**    | Parametrização individual na 1.0              |
| **USG-OUTROS**       | Procedimentos Diversos não Mapeados                  | Geral              | Fallback Seguro      | -      | 0         | Não (Desabilitado)                 | Não                                 | Não                | Sim         | **TEXTO LIVRE SEGURO**    | Requer catalogação contínua                   |

---

**Total de Procedimentos Analisados:** 19 grupos principais  
**Máscaras Estruturadas e Testadas:** 16 máscaras clínicas prioritárias completas  
**Procedimentos em Texto Livre Seguro:** Fallback com título médico rigoroso (NUNCA Abdome Total)  
**Validação de Segurança:** Bloqueio garantido de inserção automática de diagnósticos ou achados patológicos.
