migrate(
  (app) => {
    const procsCol = app.findCollectionByNameOrId('clinic_procedures')
    const clinics = ['HM Samuel Marques dos Santos', 'Gastroimagem']

    // Lista consolidada de procedimentos clínicos (87 procedimentos e variantes)
    // Categorias suportadas no schema: abdome, tireoide, articulacoes, partes_moles, doppler, obstetricia, geral
    const PROCEDURES_CATALOG = [
      // 1. ABDOME E DIGESTIVO
      {
        name: 'Ultrassonografia de Abdome Total',
        category: 'abdome',
        code: 'US-ABD-01',
        duration: 20,
      },
      {
        name: 'Ultrassonografia de Abdome Superior',
        category: 'abdome',
        code: 'US-ABD-02',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Fígado e Vias Biliares',
        category: 'abdome',
        code: 'US-ABD-03',
        duration: 15,
      },
      { name: 'Ultrassonografia de Pâncreas', category: 'abdome', code: 'US-ABD-04', duration: 15 },
      { name: 'Ultrassonografia de Baço', category: 'abdome', code: 'US-ABD-05', duration: 15 },
      {
        name: 'Ultrassonografia de Apêndice Cecal',
        category: 'abdome',
        code: 'US-ABD-06',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Alças Intestinais / Intestino Delgado',
        category: 'abdome',
        code: 'US-ABD-07',
        duration: 20,
      },
      {
        name: 'Ultrassonografia de Parede Abdominal (Hérnia Epigástrica / Umbilical / Incisional)',
        category: 'partes_moles',
        code: 'US-ABD-08',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Região Inguinal Bilateral',
        category: 'partes_moles',
        code: 'US-ABD-09',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Região Inguinal Unilateral Direita',
        category: 'partes_moles',
        code: 'US-ABD-10',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Região Inguinal Unilateral Esquerda',
        category: 'partes_moles',
        code: 'US-ABD-11',
        duration: 15,
      },

      // 2. URINÁRIO E GENITURINÁRIO MASCULINO
      {
        name: 'Ultrassonografia de Rins e Vias Urinárias',
        category: 'abdome',
        code: 'US-REN-01',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Bexiga Urinária com Resíduo Pós-Miccional',
        category: 'abdome',
        code: 'US-REN-02',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Próstata via Abdominal',
        category: 'abdome',
        code: 'US-PROST-01',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Próstata Transretal',
        category: 'geral',
        code: 'US-PROST-02',
        duration: 25,
      },
      {
        name: 'Ultrassonografia de Bolsa Escrotal (Testículos e Epidídimos)',
        category: 'geral',
        code: 'US-ESCROT-01',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Bolsa Escrotal com Doppler Colorido',
        category: 'doppler',
        code: 'US-ESCROT-02',
        duration: 20,
      },
      { name: 'Ultrassonografia de Pênis', category: 'geral', code: 'US-PEN-01', duration: 15 },
      {
        name: 'Doppler Colorido Peniano Farmacoinduzido',
        category: 'doppler',
        code: 'US-PEN-02',
        duration: 30,
      },

      // 3. GINECOLOGIA E PELVE
      {
        name: 'Ultrassonografia Pélvica Ginecológica (via abdominal)',
        category: 'obstetricia',
        code: 'US-PEL-01',
        duration: 15,
      },
      {
        name: 'Ultrassonografia Pélvica Transvaginal',
        category: 'obstetricia',
        code: 'US-TV-01',
        duration: 20,
      },
      {
        name: 'Ultrassonografia Transvaginal para Mapeamento de Endometriose Profunda',
        category: 'obstetricia',
        code: 'US-TV-02',
        duration: 35,
      },
      {
        name: 'Ultrassonografia Transvaginal com Doppler Colorido',
        category: 'doppler',
        code: 'US-TV-03',
        duration: 20,
      },
      {
        name: 'Ultrassonografia Transvaginal para Controle de Ovulação / Monitoramento Folicular',
        category: 'obstetricia',
        code: 'US-TV-04',
        duration: 15,
      },

      // 4. OBSTETRÍCIA
      {
        name: 'Ultrassonografia Obstétrica Inicial / 1º Trimestre (via transvaginal/abdominal)',
        category: 'obstetricia',
        code: 'US-OBS-01',
        duration: 20,
      },
      {
        name: 'Ultrassonografia Obstétrica Básica (2º e 3º Trimestres)',
        category: 'obstetricia',
        code: 'US-OBS-02',
        duration: 20,
      },
      {
        name: 'Ultrassonografia Obstétrica Morfológica de 1º Trimestre (com Translucência Nucal)',
        category: 'obstetricia',
        code: 'US-OBS-03',
        duration: 30,
      },
      {
        name: 'Ultrassonografia Obstétrica Morfológica de 2º Trimestre',
        category: 'obstetricia',
        code: 'US-OBS-04',
        duration: 35,
      },
      {
        name: 'Ultrassonografia Obstétrica com Doppler Colorido',
        category: 'doppler',
        code: 'US-OBS-05',
        duration: 25,
      },
      {
        name: 'Ultrassonografia Obstétrica em Gestação Gemelar',
        category: 'obstetricia',
        code: 'US-OBS-06',
        duration: 35,
      },
      {
        name: 'Ultrassonografia Obstétrica em Gestação Gemelar com Doppler',
        category: 'doppler',
        code: 'US-OBS-07',
        duration: 40,
      },
      {
        name: 'Perfil Biofísico Fetal (PBF)',
        category: 'obstetricia',
        code: 'US-OBS-08',
        duration: 25,
      },
      {
        name: 'Ultrassonografia Obstétrica 3D / 4D',
        category: 'obstetricia',
        code: 'US-OBS-09',
        duration: 30,
      },

      // 5. TIREOIDE E REGIÃO CERVICAL
      {
        name: 'Ultrassonografia de Tireoide',
        category: 'tireoide',
        code: 'US-TIR-01',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Tireoide com Doppler Colorido',
        category: 'tireoide',
        code: 'US-TIR-02',
        duration: 20,
      },
      {
        name: 'Ultrassonografia da Região Cervical (Pescoço e Linfonodos)',
        category: 'tireoide',
        code: 'US-CERV-01',
        duration: 20,
      },
      {
        name: 'Ultrassonografia de Glândulas Salivares (Parótidas e Submandibulares)',
        category: 'tireoide',
        code: 'US-SALIV-01',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Parótidas',
        category: 'tireoide',
        code: 'US-SALIV-02',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Glândulas Submandibulares',
        category: 'tireoide',
        code: 'US-SALIV-03',
        duration: 15,
      },

      // 6. MAMAS
      {
        name: 'Ultrassonografia Mamária Bilateral',
        category: 'partes_moles',
        code: 'US-MAM-01',
        duration: 20,
      },
      {
        name: 'Ultrassonografia Mamária Unilateral Direita',
        category: 'partes_moles',
        code: 'US-MAM-02D',
        duration: 15,
      },
      {
        name: 'Ultrassonografia Mamária Unilateral Esquerda',
        category: 'partes_moles',
        code: 'US-MAM-02E',
        duration: 15,
      },
      {
        name: 'Ultrassonografia Mamária Bilateral com Doppler Colorido',
        category: 'doppler',
        code: 'US-MAM-03',
        duration: 25,
      },
      {
        name: 'Ultrassonografia de Regiões Axilares Bilaterais',
        category: 'partes_moles',
        code: 'US-AXIL-01',
        duration: 15,
      },

      // 7. DOPPLER VASCULAR
      {
        name: 'Doppler Colorido de Carótidas e Vertebrais',
        category: 'doppler',
        code: 'US-DOP-CAR-01',
        duration: 25,
      },
      {
        name: 'Doppler das Artérias Renais',
        category: 'doppler',
        code: 'US-DOP-REN-01',
        duration: 30,
      },
      {
        name: 'Doppler de Aorta Abdominal e Artérias Ilíacas',
        category: 'doppler',
        code: 'US-DOP-AORTA-01',
        duration: 25,
      },
      {
        name: 'Doppler de Veia Cava Inferior e Veias Ilíacas',
        category: 'doppler',
        code: 'US-DOP-CAVA-01',
        duration: 20,
      },
      {
        name: 'Doppler do Sistema Porta e Hepático',
        category: 'doppler',
        code: 'US-DOP-PORTA-01',
        duration: 25,
      },
      {
        name: 'Doppler de Artérias Mesentéricas e Tronco Celíaco',
        category: 'doppler',
        code: 'US-DOP-MESENT-01',
        duration: 30,
      },
      {
        name: 'Doppler Venoso de Membros Inferiores Bilateral',
        category: 'doppler',
        code: 'US-DOP-VEN-MIB',
        duration: 30,
      },
      {
        name: 'Doppler Venoso de Membro Inferior Direito',
        category: 'doppler',
        code: 'US-DOP-VEN-MID',
        duration: 20,
      },
      {
        name: 'Doppler Venoso de Membro Inferior Esquerdo',
        category: 'doppler',
        code: 'US-DOP-VEN-MIE',
        duration: 20,
      },
      {
        name: 'Doppler Arterial de Membros Inferiores Bilateral',
        category: 'doppler',
        code: 'US-DOP-ART-MIB',
        duration: 35,
      },
      {
        name: 'Doppler Arterial de Membro Inferior Direito',
        category: 'doppler',
        code: 'US-DOP-ART-MID',
        duration: 20,
      },
      {
        name: 'Doppler Arterial de Membro Inferior Esquerdo',
        category: 'doppler',
        code: 'US-DOP-ART-MIE',
        duration: 20,
      },
      {
        name: 'Doppler Venoso de Membros Superiores Bilateral',
        category: 'doppler',
        code: 'US-DOP-VEN-MSB',
        duration: 30,
      },
      {
        name: 'Doppler Venoso de Membro Superior Direito',
        category: 'doppler',
        code: 'US-DOP-VEN-MSD',
        duration: 20,
      },
      {
        name: 'Doppler Venoso de Membro Superior Esquerdo',
        category: 'doppler',
        code: 'US-DOP-VEN-MSE',
        duration: 20,
      },
      {
        name: 'Doppler Arterial de Membros Superiores Bilateral',
        category: 'doppler',
        code: 'US-DOP-ART-MSB',
        duration: 30,
      },
      {
        name: 'Doppler Arterial de Membro Superior Direito',
        category: 'doppler',
        code: 'US-DOP-ART-MSD',
        duration: 20,
      },
      {
        name: 'Doppler Arterial de Membro Superior Esquerdo',
        category: 'doppler',
        code: 'US-DOP-ART-MSE',
        duration: 20,
      },

      // 8. MUSCULOESQUELÉTICO E ARTICULAÇÕES
      {
        name: 'Ultrassonografia de Ombro Direito',
        category: 'articulacoes',
        code: 'US-MSK-OMBD',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Ombro Esquerdo',
        category: 'articulacoes',
        code: 'US-MSK-OMBE',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Ombros Bilateral',
        category: 'articulacoes',
        code: 'US-MSK-OMBB',
        duration: 25,
      },
      {
        name: 'Ultrassonografia de Cotovelo Direito',
        category: 'articulacoes',
        code: 'US-MSK-COTD',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Cotovelo Esquerdo',
        category: 'articulacoes',
        code: 'US-MSK-COTE',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Cotovelos Bilateral',
        category: 'articulacoes',
        code: 'US-MSK-COTB',
        duration: 25,
      },
      {
        name: 'Ultrassonografia de Punho Direito',
        category: 'articulacoes',
        code: 'US-MSK-PUND',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Punho Esquerdo',
        category: 'articulacoes',
        code: 'US-MSK-PUNE',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Punhos Bilateral',
        category: 'articulacoes',
        code: 'US-MSK-PUNB',
        duration: 25,
      },
      {
        name: 'Ultrassonografia de Mão Direita',
        category: 'articulacoes',
        code: 'US-MSK-MAOD',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Mão Esquerda',
        category: 'articulacoes',
        code: 'US-MSK-MAOE',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Mãos Bilateral',
        category: 'articulacoes',
        code: 'US-MSK-MAOB',
        duration: 25,
      },
      {
        name: 'Ultrassonografia de Quadril Direito',
        category: 'articulacoes',
        code: 'US-MSK-QUAD',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Quadril Esquerdo',
        category: 'articulacoes',
        code: 'US-MSK-QUAE',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Joelho Direito',
        category: 'articulacoes',
        code: 'US-MSK-JOED',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Joelho Esquerdo',
        category: 'articulacoes',
        code: 'US-MSK-JOEE',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Joelhos Bilateral',
        category: 'articulacoes',
        code: 'US-MSK-JOEB',
        duration: 25,
      },
      {
        name: 'Ultrassonografia de Tornozelo Direito',
        category: 'articulacoes',
        code: 'US-MSK-TORD',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Tornozelo Esquerdo',
        category: 'articulacoes',
        code: 'US-MSK-TORE',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Tornozelos Bilateral',
        category: 'articulacoes',
        code: 'US-MSK-TORB',
        duration: 25,
      },
      {
        name: 'Ultrassonografia de Pé Direito',
        category: 'articulacoes',
        code: 'US-MSK-PED',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Pé Esquerdo',
        category: 'articulacoes',
        code: 'US-MSK-PEE',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Pés Bilateral',
        category: 'articulacoes',
        code: 'US-MSK-PEB',
        duration: 25,
      },
      {
        name: 'Ultrassonografia de Tendão de Aquiles Direito (Calcâneo)',
        category: 'articulacoes',
        code: 'US-MSK-AQUID',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Tendão de Aquiles Esquerdo (Calcâneo)',
        category: 'articulacoes',
        code: 'US-MSK-AQUIE',
        duration: 15,
      },

      // 9. PARTES MOLES E DIVERSOS
      {
        name: 'Ultrassonografia de Partes Moles',
        category: 'partes_moles',
        code: 'US-PM-01',
        duration: 15,
      },
      {
        name: 'Ultrassonografia de Músculo / Fáscia',
        category: 'partes_moles',
        code: 'US-PM-02',
        duration: 15,
      },
      {
        name: 'Ultrassonografia Dermatológica (Pele e Fâneros)',
        category: 'partes_moles',
        code: 'US-PM-03',
        duration: 20,
      },
      {
        name: 'Ultrassonografia de Tórax (Pleura e Pulmão)',
        category: 'geral',
        code: 'US-TORAX-01',
        duration: 15,
      },
      {
        name: 'Ultrassonografia Ocular / Órbitas',
        category: 'geral',
        code: 'US-OCU-01',
        duration: 20,
      },
      {
        name: 'Ultrassonografia Transfontanela (Crânio Neonatal)',
        category: 'geral',
        code: 'US-TRANSF-01',
        duration: 20,
      },
    ]

    for (const clinic of clinics) {
      for (const p of PROCEDURES_CATALOG) {
        try {
          const found = app.findFirstRecordByFilter(
            'clinic_procedures',
            `clinic_location = "${clinic}" && name = "${p.name}"`,
          )
          if (found) continue
        } catch (_) {}

        const rec = new Record(procsCol)
        rec.set('clinic_location', clinic)
        rec.set('name', p.name)
        rec.set('category', p.category)
        rec.set('internal_code', p.code)
        rec.set('modality', 'US')
        rec.set('default_duration_minutes', p.duration)
        rec.set('is_active', true)
        rec.set('price_card_installment', 0)
        rec.set('price_card_cash', 0)
        rec.set('price_pix_cash', 0)
        rec.set('doctor_payout_type', 'none')
        rec.set('doctor_payout_value', 0)
        rec.set(
          'price_history',
          JSON.stringify([
            {
              date: new Date().toISOString(),
              author: 'Sistema',
              reason: 'Carga completa do Catálogo Único de 87 procedimentos v0.0.64',
            },
          ]),
        )
        app.save(rec)
      }
    }
  },
  (app) => {
    // down: noop
  },
)
