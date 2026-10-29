import {
  calculateKatz,
  calculateLawton,
  calculateG8,
  calculateFried,
  calculateFallRisk,
} from './geriatricTools'

export interface FixtureTestResult {
  instrument: string
  caseName: string
  passed: boolean
  expected: string
  received: string
  details?: string
}

export function runGeriatricCalculationFixtures(): FixtureTestResult[] {
  const results: FixtureTestResult[] = []

  // 1. KATZ: Todos independentes -> 6/6 Totalmente Independente
  {
    const answers = {
      banho: 'independente',
      vestir: 'independente',
      higiene: 'independente',
      transferencia: 'independente',
      continencia: 'independente',
      alimentacao: 'independente',
    }
    const res = calculateKatz(answers)
    const passed = res.scoreNumber === 6 && res.classification === 'Totalmente Independente'
    results.push({
      instrument: 'Katz',
      caseName: '6/6 independente total',
      passed,
      expected: 'score=6, Totalmente Independente',
      received: `score=${res.scoreNumber}, ${res.classification}`,
    })
  }

  // 1b. KATZ: 2 dependentes (vestir e banho) -> 4/6 Dependência Ligeira / Moderada
  {
    const answers = {
      banho: 'dependente',
      vestir: 'dependente',
      higiene: 'independente',
      transferencia: 'independente',
      continencia: 'independente',
      alimentacao: 'independente',
    }
    const res = calculateKatz(answers)
    const passed = res.scoreNumber === 4 && res.classification === 'Dependência Ligeira / Moderada'
    results.push({
      instrument: 'Katz',
      caseName: '4/6 dependência ligeira',
      passed,
      expected: 'score=4, Dependência Ligeira / Moderada',
      received: `score=${res.scoreNumber}, ${res.classification}`,
    })
  }

  // 1c. KATZ: 0 pontos -> Dependência Muito Grave / Total
  {
    const answers = {
      banho: 'dependente',
      vestir: 'dependente',
      higiene: 'dependente',
      transferencia: 'dependente',
      continencia: 'dependente',
      alimentacao: 'dependente',
    }
    const res = calculateKatz(answers)
    const passed = res.scoreNumber === 0 && res.classification === 'Dependência Muito Grave / Total'
    results.push({
      instrument: 'Katz',
      caseName: '0/6 dependência total',
      passed,
      expected: 'score=0, Dependência Muito Grave / Total',
      received: `score=${res.scoreNumber}, ${res.classification}`,
    })
  }

  // 2. LAWTON: 24/24 independência máxima
  {
    const answers = {
      telefone: '3',
      compras: '3',
      refeicoes: '3',
      tarefas_domesticas: '3',
      lavanderia: '3',
      transporte: '3',
      medicamentos: '3',
      financas: '3',
    }
    const res = calculateLawton(answers)
    const passed =
      res.scoreNumber === 24 && res.classification === 'Independência Instrumental Total'
    results.push({
      instrument: 'Lawton',
      caseName: '24/24 independência total',
      passed,
      expected: 'score=24, Independência Instrumental Total',
      received: `score=${res.scoreNumber}, ${res.classification}`,
    })
  }

  // 2b. LAWTON: tudo dependente (8 pontos) -> Dependência Grave / Total
  {
    const answers = {
      telefone: '1',
      compras: '1',
      refeicoes: '1',
      tarefas_domesticas: '1',
      lavanderia: '1',
      transporte: '1',
      medicamentos: '1',
      financas: '1',
    }
    const res = calculateLawton(answers)
    const passed =
      res.scoreNumber === 8 && res.classification === 'Dependência Grave / Total em AIVD'
    results.push({
      instrument: 'Lawton',
      caseName: '8/24 dependência grave',
      passed,
      expected: 'score=8, Dependência Grave / Total em AIVD',
      received: `score=${res.scoreNumber}, ${res.classification}`,
    })
  }

  // 3. G8: Máximo 17/17 -> Perfil Robusto
  {
    const answers = {
      ingesta: '2', // 2
      peso: '3', // 3
      mobilidade: '2', // 2
      neuropsico: '2', // 2
      imc: '3', // 3
      polifarmacia: '1', // 1
      autopercepcao: '2', // 2
      idade: '2', // 2 (<80)
    }
    const res = calculateG8(answers)
    const passed = res.scoreNumber === 17 && res.classification.includes('Robusto')
    results.push({
      instrument: 'G8',
      caseName: '17/17 máximo robusto',
      passed,
      expected: 'score=17, Escore > 14: Triagem Normal (Perfil Robusto)',
      received: `score=${res.scoreNumber}, ${res.classification}`,
    })
  }

  // 3b. G8: Vulnerável (corte <= 14, ex.: 12/17) -> Sugere Avaliação Geriátrica Ampla
  {
    const answers = {
      ingesta: '1', // 1
      peso: '2', // 2
      mobilidade: '1', // 1
      neuropsico: '1', // 1
      imc: '2', // 2
      polifarmacia: '0', // 0 (toma >3 remédios)
      autopercepcao: '1', // 1
      idade: '1', // 1 (80 a 85)
    }
    // Soma: 1+2+1+1+2+0+1+1 = 9 <= 14
    const res = calculateG8(answers)
    const passed =
      res.scoreNumber === 9 && res.classification.includes('Sugere Avaliação Geriátrica Ampla')
    results.push({
      instrument: 'G8',
      caseName: '9/17 vulnerável sugere AGA',
      passed,
      expected: 'score=9, Escore <= 14: Sugere Avaliação Geriátrica Ampla (AGA)',
      received: `score=${res.scoreNumber}, ${res.classification}`,
    })
  }

  // 4. FRIED: 0 critérios -> Robusto
  {
    const answers = {
      perda_peso: 'ausente',
      exaustao: 'ausente',
      fraqueza: 'ausente',
      lentidao: 'ausente',
      baixo_gasto: 'ausente',
    }
    const res = calculateFried(answers)
    const passed = res.scoreNumber === 0 && res.classification === 'Robusto (0 critérios)'
    results.push({
      instrument: 'Fried',
      caseName: '0 critérios = Robusto',
      passed,
      expected: 'score=0, Robusto (0 critérios)',
      received: `score=${res.scoreNumber}, ${res.classification}`,
    })
  }

  // 4b. FRIED: 1 ou 2 critérios -> Pré-frágil
  {
    const answers = {
      perda_peso: 'presente',
      exaustao: 'ausente',
      fraqueza: 'presente',
      lentidao: 'ausente',
      baixo_gasto: 'ausente',
    }
    const res = calculateFried(answers)
    const passed = res.scoreNumber === 2 && res.classification === 'Pré-frágil (2 critérios)'
    results.push({
      instrument: 'Fried',
      caseName: '2 critérios = Pré-frágil',
      passed,
      expected: 'score=2, Pré-frágil (2 critérios)',
      received: `score=${res.scoreNumber}, ${res.classification}`,
    })
  }

  // 4c. FRIED: 3 ou mais critérios -> Frágil
  {
    const answers = {
      perda_peso: 'presente',
      exaustao: 'presente',
      fraqueza: 'presente',
      lentidao: 'presente',
      baixo_gasto: 'ausente',
    }
    const res = calculateFried(answers)
    const passed = res.scoreNumber === 4 && res.classification === 'Frágil (4 critérios)'
    results.push({
      instrument: 'Fried',
      caseName: '4 critérios = Frágil',
      passed,
      expected: 'score=4, Frágil (4 critérios)',
      received: `score=${res.scoreNumber}, ${res.classification}`,
    })
  }

  // 5. FALL RISK (STEADI): 0 pontos -> Baixo risco
  {
    const answers = {
      queda_recente: 'nao',
      medicacao_sono: 'nao',
      tontura: 'nao',
      apoio_andar: 'nao',
      levantar_cadeira: 'nao',
      subir_degraus: 'nao',
      pressa_banheiro: 'nao',
      sensibilidade_pes: 'nao',
      medo_cair: 'nao',
      visao: 'nao',
      antidepressivos: 'nao',
    }
    const res = calculateFallRisk(answers)
    const passed = res.scoreNumber === 0 && res.classification.includes('Baixo Risco')
    results.push({
      instrument: 'Risco de Queda',
      caseName: '0 pontos = Baixo Risco',
      passed,
      expected: 'score=0, Baixo Risco de Queda (0 pts)',
      received: `score=${res.scoreNumber}, ${res.classification}`,
    })
  }

  // 5b. FALL RISK (STEADI): Queda recente (2) + Apoio ao andar (2) + Tontura (1) = 5 pts -> Risco Moderado
  {
    const answers = {
      queda_recente: 'sim', // 2
      medicacao_sono: 'nao',
      tontura: 'sim', // 1
      apoio_andar: 'sim', // 2
      levantar_cadeira: 'nao',
      subir_degraus: 'nao',
      pressa_banheiro: 'nao',
      sensibilidade_pes: 'nao',
      medo_cair: 'nao',
      visao: 'nao',
      antidepressivos: 'nao',
    }
    const res = calculateFallRisk(answers)
    const passed = res.scoreNumber === 5 && res.classification.includes('Risco Moderado')
    results.push({
      instrument: 'Risco de Queda',
      caseName: '5 pontos = Risco Moderado',
      passed,
      expected: 'score=5, Risco Moderado de Queda (5 pts)',
      received: `score=${res.scoreNumber}, ${res.classification}`,
    })
  }

  return results
}
