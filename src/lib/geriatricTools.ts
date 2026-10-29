/**
 * Biblioteca de Instrumentos de Avaliação Geriátrica Ampla (GeriTools)
 *
 * Instrumentos validados de conteúdo de domínio público e acesso aberto:
 * 1. Katz ADL (Activities of Daily Living - Índice de Independência nas Atividades Básicas de Vida Diária)
 * 2. Lawton & Brody iADL (Atividades Instrumentais de Vida Diária - escala validada clássica com ajuste de aplicabilidade)
 * 3. G8 Screening Tool (Triagem Geriátrica em Oncologia - 8 itens, corte <= 14)
 * 4. Fenótipo de Fragilidade de Fried (5 critérios: perda involuntária de peso, exaustão, fraqueza, lentidão, baixo nível de atividade)
 * 5. Escala de Risco de Queda Baseada no Algoritmo STEADI (CDC / domínio público aberto - Stay Independent screening)
 *
 * NOTA ÉTICA / DIREITOS AUTORAIS:
 * - Instrumentos com direitos autorais restritos (ex.: folha oficial MMSE / Mini-Exame do Estado Mental da Folstein)
 *   NÃO são reproduzidos aqui com perguntas verbatim. Disponibiliza-se campo para registro do escore do teste cognitivo livre.
 */

export type GeriatricInstrumentType = 'katz' | 'lawton' | 'g8' | 'fried' | 'fall_risk'

export interface InstrumentOption {
  value: string | number
  label: string
  points: number
  description?: string
}

export interface InstrumentQuestion {
  id: string
  title: string
  description?: string
  options: InstrumentOption[]
}

export interface InstrumentDefinition {
  type: GeriatricInstrumentType
  title: string
  shortTitle: string
  subtitle: string
  reference: string
  copyrightNote: string
  maxScoreDisplay: string
  questions: InstrumentQuestion[]
}

export interface AssessmentCalculationResult {
  scoreNumber: number
  scoreDisplay: string
  classification: string
  classificationTone: 'normal' | 'warning' | 'danger'
  interpretation: string
  summaryMarkdown: string
  answeredCount: number
  totalCount: number
  isComplete: boolean
}

// -----------------------------------------------------------------------------
// 1. KATZ ADL (6 itens clássicos, 0 a 6 pontos; 1 ponto = independente)
// -----------------------------------------------------------------------------
export const KATZ_INSTRUMENT: InstrumentDefinition = {
  type: 'katz',
  title: 'Índice de Katz de Independência em Atividades de Vida Diária (ABVD)',
  shortTitle: 'Katz ABVD',
  subtitle: 'Avaliação da independência funcional em 6 atividades básicas de vida diária',
  reference:
    'Katz S, Ford AB, Moskowitz RW, Jackson BA, Jaffe MW. Studies of Illness in the Aged. The Index of ADL. JAMA. 1963;185(12):914–919.',
  copyrightNote: 'Instrumento validado em domínio público.',
  maxScoreDisplay: '0 a 6 pontos (1 pt por atividade independente)',
  questions: [
    {
      id: 'banho',
      title: '1. Banho',
      description: 'Lavar-se completamente na banheira, chuveiro ou com esponja',
      options: [
        {
          value: 'independente',
          points: 1,
          label: 'Independente',
          description:
            'Não precisa de ajuda ou precisa apenas para lavar uma única parte do corpo (ex.: costas)',
        },
        {
          value: 'dependente',
          points: 0,
          label: 'Dependente',
          description:
            'Precisa de ajuda para lavar mais de uma parte do corpo, para entrar ou sair da banheira/box, ou não toma banho sozinho',
        },
      ],
    },
    {
      id: 'vestir',
      title: '2. Vestir-se',
      description: 'Pegar roupas no armário, calçar meias e sapatos, fechar zíperes e botões',
      options: [
        {
          value: 'independente',
          points: 1,
          label: 'Independente',
          description:
            'Pega as roupas e veste-se completamente sem auxílio (exceto amarrar sapatos)',
        },
        {
          value: 'dependente',
          points: 0,
          label: 'Dependente',
          description:
            'Recebe auxílio para vestir-se ou permanece parcial ou totalmente desvestido se não for ajudado',
        },
      ],
    },
    {
      id: 'higiene',
      title: '3. Uso do Vaso Sanitário / Higiene Pessoal',
      description: 'Ir ao banheiro, despir-se, fazer higiene íntima e recompor as roupas',
      options: [
        {
          value: 'independente',
          points: 1,
          label: 'Independente',
          description:
            'Vai ao banheiro, usa o vaso, limpa-se e ajeita as roupas sem ajuda (pode usar suportes ou comadre noturna se a esvaziar)',
        },
        {
          value: 'dependente',
          points: 0,
          label: 'Dependente',
          description:
            'Recebe ajuda para ir ao vaso, para limpar-se, vestir-se ou usa comadre/papagaio/fralda sob cuidados',
        },
      ],
    },
    {
      id: 'transferencia',
      title: '4. Transferência',
      description: 'Deitar e levantar da cama e da cadeira',
      options: [
        {
          value: 'independente',
          points: 1,
          label: 'Independente',
          description:
            'Deita e levanta da cama e senta e levanta da cadeira sem auxílio humano (pode usar apoio mecânico como bengala/andador)',
        },
        {
          value: 'dependente',
          points: 0,
          label: 'Dependente',
          description:
            'Precisa de ajuda de outra pessoa para se transferir ou é acamado/cadeirante dependente',
        },
      ],
    },
    {
      id: 'continencia',
      title: '5. Continência Esfincteriana',
      description: 'Controle completo da micção e da evacuação',
      options: [
        {
          value: 'independente',
          points: 1,
          label: 'Independente',
          description: 'Controla totalmente urina e fezes sem acidentes frequentes',
        },
        {
          value: 'dependente',
          points: 0,
          label: 'Dependente',
          description:
            'Incontinência parcial ou total, ou controle mantido apenas por sondagem, enemas ou uso regular de fraldas',
        },
      ],
    },
    {
      id: 'alimentacao',
      title: '6. Alimentação',
      description: 'Levar o alimento do prato à boca (não inclui preparo culinário)',
      options: [
        {
          value: 'independente',
          points: 1,
          label: 'Independente',
          description:
            'Leva a comida do prato à boca sem ajuda (pode requerer que carne seja previamente cortada)',
        },
        {
          value: 'dependente',
          points: 0,
          label: 'Dependente',
          description: 'Precisa de ajuda para se alimentar ou recebe nutrição enteral/parenteral',
        },
      ],
    },
  ],
}

export function calculateKatz(answers: Record<string, string>): AssessmentCalculationResult {
  const questions = KATZ_INSTRUMENT.questions
  let score = 0
  let answered = 0
  const lines: string[] = []

  questions.forEach((q) => {
    const val = answers[q.id]
    if (val !== undefined && val !== '') {
      answered++
      const opt = q.options.find((o) => o.value === val)
      const pts = opt?.points ?? 0
      score += pts
      lines.push(`- **${q.title.replace(/^\d+\.\s*/, '')}**: ${opt?.label || val} (${pts} pt)`)
    }
  })

  let classification = ''
  let tone: 'normal' | 'warning' | 'danger' = 'normal'
  let interpretation = ''

  if (score === 6) {
    classification = 'Totalmente Independente'
    tone = 'normal'
    interpretation =
      'Independência funcional completa para todas as 6 atividades básicas de vida diária avaliadas.'
  } else if (score >= 4) {
    classification = 'Dependência Ligeira / Moderada'
    tone = 'warning'
    interpretation =
      'Independente na maioria das funções, com dependência em 1 ou 2 atividades básicas. Requer suporte pontual.'
  } else if (score >= 2) {
    classification = 'Dependência Moderada / Importante'
    tone = 'danger'
    interpretation =
      'Dependência em 3 ou 4 atividades básicas. Necessita de cuidador para atividades diárias essenciais.'
  } else {
    classification = 'Dependência Muito Grave / Total'
    tone = 'danger'
    interpretation =
      'Dependência em 5 ou todas as 6 atividades básicas. Alta demanda de cuidados continuados.'
  }

  const isComplete = answered === questions.length

  const summaryMarkdown = `### Avaliação Funcional — Índice de Katz (ABVD)
**Data:** ${new Date().toLocaleDateString('pt-BR')}
**Pontuação:** ${score}/6 pontos (${answered}/${questions.length} itens preenchidos)
**Classificação:** **${classification}**

**Detalhamento por Função:**
${lines.join('\n')}

**Interpretação Clínica:**
${interpretation}

*Referência: Katz et al., JAMA 1963.*`

  return {
    scoreNumber: score,
    scoreDisplay: `${score}/6`,
    classification,
    classificationTone: tone,
    interpretation,
    summaryMarkdown,
    answeredCount: answered,
    totalCount: questions.length,
    isComplete,
  }
}

// -----------------------------------------------------------------------------
// 2. LAWTON & BRODY iADL (8 itens de Atividades Instrumentais de Vida Diária, 8 a 24 pontos ou 0 a 8 na versão binária)
// Usamos a escala clássica validada de 8 itens com pontuação tradicional (1 = dependente, 2 = com ajuda, 3 = independente) -> 8 a 24 pontos,
// onde 24 = totalmente independente, <16 = dependência grave.
// -----------------------------------------------------------------------------
export const LAWTON_INSTRUMENT: InstrumentDefinition = {
  type: 'lawton',
  title: 'Escala de Lawton & Brody de Atividades Instrumentais de Vida Diária (AIVD)',
  shortTitle: 'Lawton AIVD',
  subtitle:
    'Capacidade de viver de forma independente na comunidade (gestão de rotina e autocuidado)',
  reference:
    'Lawton MP, Brody EM. Assessment of older people: self-maintaining and instrumental activities of daily living. Gerontologist. 1969;9(3):179–186.',
  copyrightNote: 'Instrumento clássico validado de livre utilização clínica.',
  maxScoreDisplay: '8 a 24 pontos (8 = dependência total, 24 = independência máxima)',
  questions: [
    {
      id: 'telefone',
      title: '1. Capacidade de Usar o Telefone',
      options: [
        {
          value: '3',
          points: 3,
          label: 'Independente',
          description: 'Usa o telefone por iniciativa própria, disca e atende sem auxílio',
        },
        {
          value: '2',
          points: 2,
          label: 'Parcialmente dependente',
          description: 'Disca apenas números conhecidos ou bem familiares, ou apenas atende',
        },
        {
          value: '1',
          points: 1,
          label: 'Dependente',
          description: 'Não usa o telefone de maneira alguma',
        },
      ],
    },
    {
      id: 'compras',
      title: '2. Fazer Compras',
      options: [
        {
          value: '3',
          points: 3,
          label: 'Independente',
          description:
            'Realiza todas as compras necessárias com independência de escolha e pagamento',
        },
        {
          value: '2',
          points: 2,
          label: 'Parcialmente dependente',
          description: 'Faz pequenas compras de forma independente ou precisa de companhia',
        },
        {
          value: '1',
          points: 1,
          label: 'Dependente',
          description: 'Totalmente incapaz de fazer compras sozinho',
        },
      ],
    },
    {
      id: 'refeicoes',
      title: '3. Preparo de Refeições',
      options: [
        {
          value: '3',
          points: 3,
          label: 'Independente',
          description: 'Planeja, prepara e serve refeições completas adequadas sozinho',
        },
        {
          value: '2',
          points: 2,
          label: 'Parcialmente dependente',
          description: 'Aquece refeições preparadas ou prepara refeições muito simples',
        },
        {
          value: '1',
          points: 1,
          label: 'Dependente',
          description: 'Precisa que as refeições sejam preparadas e servidas por terceiros',
        },
      ],
    },
    {
      id: 'tarefas_domesticas',
      title: '4. Tarefas Domésticas / Limpeza',
      options: [
        {
          value: '3',
          points: 3,
          label: 'Independente',
          description: 'Mantém a casa limpa sozinho ou com auxílio apenas para trabalhos pesados',
        },
        {
          value: '2',
          points: 2,
          label: 'Parcialmente dependente',
          description:
            'Realiza apenas tarefas diárias leves (ex.: arrumar a cama, lavar louça leve)',
        },
        {
          value: '1',
          points: 1,
          label: 'Dependente',
          description: 'Não participa de nenhuma tarefa doméstica',
        },
      ],
    },
    {
      id: 'lavanderia',
      title: '5. Cuidado com a Roupa (Lavar/Passar)',
      options: [
        {
          value: '3',
          points: 3,
          label: 'Independente',
          description: 'Lava e cuida de todas as suas roupas pessoais',
        },
        {
          value: '2',
          points: 2,
          label: 'Parcialmente dependente',
          description: 'Lava apenas pequenas peças (roupas íntimas, meias)',
        },
        {
          value: '1',
          points: 1,
          label: 'Dependente',
          description: 'Toda a roupa precisa ser lavada por terceiros',
        },
      ],
    },
    {
      id: 'transporte',
      title: '6. Meio de Transporte / Deslocamento',
      options: [
        {
          value: '3',
          points: 3,
          label: 'Independente',
          description:
            'Viaja sozinho em transporte público, táxi/aplicativo ou dirige veículo próprio',
        },
        {
          value: '2',
          points: 2,
          label: 'Parcialmente dependente',
          description: 'Viaja em transporte se acompanhado ou anda apenas em táxi com assistência',
        },
        {
          value: '1',
          points: 1,
          label: 'Dependente',
          description:
            'Não viaja; deslocamentos apenas em ambulância ou sob condução direta de terceiros',
        },
      ],
    },
    {
      id: 'medicamentos',
      title: '7. Responsabilidade com a Própria Medicação',
      options: [
        {
          value: '3',
          points: 3,
          label: 'Independente',
          description: 'Toma os medicamentos na dose e nos horários corretos por conta própria',
        },
        {
          value: '2',
          points: 2,
          label: 'Parcialmente dependente',
          description: 'Toma se as doses forem previamente preparadas e organizadas por outrem',
        },
        {
          value: '1',
          points: 1,
          label: 'Dependente',
          description: 'Incapaz de administrar a própria medicação',
        },
      ],
    },
    {
      id: 'financas',
      title: '8. Capacidade de Gerenciar as Finanças',
      options: [
        {
          value: '3',
          points: 3,
          label: 'Independente',
          description:
            'Cuida das finanças com autonomia (paga contas, vai ao banco, controla saldo)',
        },
        {
          value: '2',
          points: 2,
          label: 'Parcialmente dependente',
          description:
            'Gerencia apenas pequenos gastos diários, mas necessita de ajuda com contas maiores/banco',
        },
        {
          value: '1',
          points: 1,
          label: 'Dependente',
          description: 'Incapaz de lidar com dinheiro',
        },
      ],
    },
  ],
}

export function calculateLawton(answers: Record<string, string>): AssessmentCalculationResult {
  const questions = LAWTON_INSTRUMENT.questions
  let score = 0
  let answered = 0
  const lines: string[] = []

  questions.forEach((q) => {
    const val = answers[q.id]
    if (val !== undefined && val !== '') {
      answered++
      const opt = q.options.find((o) => o.value === val)
      const pts = opt?.points ?? 1
      score += pts
      lines.push(`- **${q.title.replace(/^\d+\.\s*/, '')}**: ${opt?.label || val} (${pts} pts)`)
    }
  })

  let classification = ''
  let tone: 'normal' | 'warning' | 'danger' = 'normal'
  let interpretation = ''

  if (score === 24) {
    classification = 'Independência Instrumental Total'
    tone = 'normal'
    interpretation =
      'Independência completa para gestão da vida cotidiana na comunidade (24/24 pts).'
  } else if (score >= 19) {
    classification = 'Dependência Leve em AIVD'
    tone = 'warning'
    interpretation =
      'Pequenas limitações em tarefas instrumentais mais complexas; autonomia comunitária preservada com auxílio pontual.'
  } else if (score >= 14) {
    classification = 'Dependência Moderada em AIVD'
    tone = 'danger'
    interpretation =
      'Dificuldade importante em múltiplas atividades instrumentais. Requer suporte estruturado de familiares ou cuidador.'
  } else {
    classification = 'Dependência Grave / Total em AIVD'
    tone = 'danger'
    interpretation =
      'Incapacidade quase total para tarefas instrumentais essenciais à vida independente.'
  }

  const isComplete = answered === questions.length

  const summaryMarkdown = `### Avaliação Funcional — Escala de Lawton & Brody (AIVD)
**Data:** ${new Date().toLocaleDateString('pt-BR')}
**Pontuação:** ${score}/24 pontos (${answered}/${questions.length} itens preenchidos)
**Classificação:** **${classification}**

**Detalhamento por Função Instrumental:**
${lines.join('\n')}

**Interpretação Clínica:**
${interpretation}

*Referência: Lawton & Brody, Gerontologist 1969.*`

  return {
    scoreNumber: score,
    scoreDisplay: `${score}/24`,
    classification,
    classificationTone: tone,
    interpretation,
    summaryMarkdown,
    answeredCount: answered,
    totalCount: questions.length,
    isComplete,
  }
}

// -----------------------------------------------------------------------------
// 3. G8 GERIATRIC SCREENING TOOL (Triagem geriátrica em oncologia/geriatria, 8 itens, 0 a 17)
// Ponto de corte clássico: escore <= 14 indica vulnerabilidade / sugere AGA (Avaliação Geriátrica Ampla)
// -----------------------------------------------------------------------------
export const G8_INSTRUMENT: InstrumentDefinition = {
  type: 'g8',
  title: 'Questionário de Triagem Geriátrica G8',
  shortTitle: 'G8 Triagem',
  subtitle:
    'Triagem de vulnerabilidade geriátrica para identificação de pacientes que se beneficiam de Avaliação Geriátrica Ampla (AGA)',
  reference:
    'Bellera CA, et al. Screening tools for multidimensional health problems warranting a comprehensive geriatric assessment in older cancer patients: The G8 questionnaire. Ann Oncol. 2012;23(8):2166–2172.',
  copyrightNote: 'Instrumento de triagem geriátrica validado de livre aplicação clínica.',
  maxScoreDisplay: '0 a 17 pontos (corte <= 14 sugere vulnerabilidade / indicação de AGA)',
  questions: [
    {
      id: 'ingesta',
      title: '1. Ingesta Alimentar nos Últimos 3 Meses',
      description:
        'Houve redução da ingestão de alimentos nos últimos 3 meses devido a perda de apetite, problemas digestivos, dificuldades de mastigação ou deglutição?',
      options: [
        { value: '0', points: 0, label: '0: Redução severa da ingestão alimentar' },
        { value: '1', points: 1, label: '1: Redução moderada da ingestão alimentar' },
        { value: '2', points: 2, label: '2: Sem redução (ingestão alimentar normal)' },
      ],
    },
    {
      id: 'peso',
      title: '2. Perda de Peso nos Últimos 3 Meses',
      description: 'Houve perda involuntária de peso recente?',
      options: [
        { value: '0', points: 0, label: '0: Perda de peso superior a 3 kg' },
        { value: '1', points: 1, label: '1: Não sabe informar' },
        { value: '2', points: 2, label: '2: Perda de peso entre 1 e 3 kg' },
        { value: '3', points: 3, label: '3: Sem perda de peso' },
      ],
    },
    {
      id: 'mobilidade',
      title: '3. Mobilidade',
      description: 'Qual a capacidade de locomoção do paciente?',
      options: [
        { value: '0', points: 0, label: '0: Restrito ao leito ou à cadeira de rodas' },
        { value: '1', points: 1, label: '1: Capaz de sair da cama/cadeira mas não sai à rua' },
        { value: '2', points: 2, label: '2: Sai à rua e deambula normalmente' },
      ],
    },
    {
      id: 'neuropsico',
      title: '4. Problemas Neuropsicológicos',
      description: 'Presença de declínio cognitivo, demência ou depressão grave?',
      options: [
        { value: '0', points: 0, label: '0: Demência ou depressão severa' },
        { value: '1', points: 1, label: '1: Demência leve ou depressão moderada' },
        { value: '2', points: 2, label: '2: Sem problemas psicológicos ou cognitivos' },
      ],
    },
    {
      id: 'imc',
      title: '5. Índice de Massa Corporal (IMC em kg/m²)',
      description: 'IMC calculado (peso / altura²)',
      options: [
        { value: '0', points: 0, label: '0: IMC < 19 kg/m² (baixo peso / desnutrição)' },
        { value: '1', points: 1, label: '1: IMC 19 a < 21 kg/m²' },
        { value: '2', points: 2, label: '2: IMC 21 a < 23 kg/m²' },
        { value: '3', points: 3, label: '3: IMC >= 23 kg/m² (nutrido)' },
      ],
    },
    {
      id: 'polifarmacia',
      title: '6. Uso de Medicamentos (Polifarmácia)',
      description: 'Usa habitualmente mais de 3 medicamentos prescritos ao dia?',
      options: [
        { value: '0', points: 0, label: '0: Sim (uso de mais de 3 medicações/dia)' },
        { value: '1', points: 1, label: '1: Não (3 ou menos medicações/dia)' },
      ],
    },
    {
      id: 'autopercepcao',
      title: '7. Autopercepção da Própria Saúde',
      description:
        'Em comparação com outras pessoas da mesma idade, como o paciente considera a sua saúde?',
      options: [
        { value: '0', points: 0, label: '0.0: Pior que as outras pessoas' },
        { value: '0.5', points: 0.5, label: '0.5: Não sabe dizer' },
        { value: '1', points: 1, label: '1.0: Tão boa quanto as outras' },
        { value: '2', points: 2, label: '2.0: Melhor que as outras' },
      ],
    },
    {
      id: 'idade',
      title: '8. Faixa Etária',
      description: 'Idade cronológica do paciente',
      options: [
        { value: '0', points: 0, label: '0: Mais de 85 anos (> 85)' },
        { value: '1', points: 1, label: '1: 80 a 85 anos' },
        { value: '2', points: 2, label: '2: Menos de 80 anos (< 80)' },
      ],
    },
  ],
}

export function calculateG8(answers: Record<string, string>): AssessmentCalculationResult {
  const questions = G8_INSTRUMENT.questions
  let score = 0
  let answered = 0
  const lines: string[] = []

  questions.forEach((q) => {
    const val = answers[q.id]
    if (val !== undefined && val !== '') {
      answered++
      const opt = q.options.find((o) => o.value === val)
      const pts = opt?.points ?? 0
      score += pts
      lines.push(`- **${q.title.replace(/^\d+\.\s*/, '')}**: ${opt?.label || val} (${pts} pt)`)
    }
  })

  // Arredonda para 1 casa decimal para evitar erros de ponto flutuante com 0.5
  score = Math.round(score * 10) / 10

  let classification = ''
  let tone: 'normal' | 'warning' | 'danger' = 'normal'
  let interpretation = ''

  if (score <= 14) {
    classification = 'Escore <= 14: Sugere Avaliação Geriátrica Ampla (AGA)'
    tone = 'danger'
    interpretation =
      'Escore de triagem alterado (<= 14/17). Alta sensibilidade para fragilidade ou vulnerabilidade clínica. Recomenda-se avaliação geriátrica multidimensional abrangente (AGA) e planejamento terapêutico individualizado.'
  } else {
    classification = 'Escore > 14: Triagem Normal (Perfil Robusto)'
    tone = 'normal'
    interpretation =
      'Escore preservado (> 14/17). Baixa probabilidade de vulnerabilidade oculta; paciente elegível a condutas padrão, com seguimento periódico.'
  }

  const isComplete = answered === questions.length

  const summaryMarkdown = `### Triagem Geriátrica — Escore G8
**Data:** ${new Date().toLocaleDateString('pt-BR')}
**Pontuação Total:** ${score}/17 pontos (${answered}/${questions.length} itens respondidos)
**Classificação:** **${classification}**

**Detalhamento dos Itens:**
${lines.join('\n')}

**Recomendação Clínica:**
${interpretation}

*Referência: Bellera et al., Ann Oncol 2012 (corte clássico <= 14).*`

  return {
    scoreNumber: score,
    scoreDisplay: `${score}/17`,
    classification,
    classificationTone: tone,
    interpretation,
    summaryMarkdown,
    answeredCount: answered,
    totalCount: questions.length,
    isComplete,
  }
}

// -----------------------------------------------------------------------------
// 4. CRITÉRIOS DE FRIED (Fenótipo de Fragilidade - 5 critérios clínicos)
// 0 = Robusto, 1-2 = Pré-frágil, >=3 = Frágil
// -----------------------------------------------------------------------------
export const FRIED_INSTRUMENT: InstrumentDefinition = {
  type: 'fried',
  title: 'Fenótipo de Fragilidade de Fried (Critérios de Fragilidade)',
  shortTitle: 'Fenótipo de Fried',
  subtitle: 'Classificação da síndrome de fragilidade do idoso em Robusto, Pré-frágil ou Frágil',
  reference:
    'Fried LP, Tangen CM, Walston J, et al. Frailty in older adults: evidence for a phenotype. J Gerontol A Biol Sci Med Sci. 2001;56(3):M146–M156.',
  copyrightNote: 'Critérios clínicos operacionais de Fried de domínio público científico.',
  maxScoreDisplay: '0 a 5 critérios presentes (0 = Robusto, 1-2 = Pré-frágil, >= 3 = Frágil)',
  questions: [
    {
      id: 'perda_peso',
      title: '1. Perda Involuntária de Peso',
      description:
        'Perda de peso não intencional >= 4,5 kg ou >= 5% do peso corporal no último ano',
      options: [
        {
          value: 'presente',
          points: 1,
          label: 'Presente (perda involuntária >= 4,5 kg ou >= 5% no último ano)',
        },
        {
          value: 'ausente',
          points: 0,
          label: 'Ausente (peso estável ou perda voluntária programada)',
        },
      ],
    },
    {
      id: 'exaustao',
      title: '2. Fadiga / Autoexaustão Referida',
      description:
        'Sentimento frequente de que "qualquer esforço exigia grande energia" ou "não conseguir seguir adiante" na última semana',
      options: [
        {
          value: 'presente',
          points: 1,
          label: 'Presente (fadiga/exaustão em 3 ou mais dias na última semana)',
        },
        { value: 'ausente', points: 0, label: 'Ausente (disposição habitual mantida)' },
      ],
    },
    {
      id: 'fraqueza',
      title: '3. Fraqueza Muscular (Diminuição da Força de Preensão)',
      description:
        'Força de preensão manual reduzida no dinamômetro (abaixo do percentil 20 para sexo e IMC) ou incapacidade de abrir frascos/levantar peso habitual',
      options: [
        {
          value: 'presente',
          points: 1,
          label: 'Presente (preensão no quinto inferior ou fraqueza evidente referida/testada)',
        },
        {
          value: 'ausente',
          points: 0,
          label: 'Ausente (força de preensão adequada para idade e sexo)',
        },
      ],
    },
    {
      id: 'lentidao',
      title: '4. Lentidão da Marcha (Velocidade de Marcha Reduzida)',
      description:
        'Tempo para caminhar 4 metros acima do percentil 20 (velocidade < 0,8 m/s ou > 5 a 6 segundos para 4m)',
      options: [
        {
          value: 'presente',
          points: 1,
          label: 'Presente (velocidade de marcha < 0,8 m/s ou lentidão evidente ao deambular)',
        },
        { value: 'ausente', points: 0, label: 'Ausente (velocidade de marcha normal/preservada)' },
      ],
    },
    {
      id: 'baixo_gasto',
      title: '5. Baixo Nível de Atividade Física',
      description:
        'Sedentarismo acentuado, tempo diário prolongado sentado ou gasto calórico no quinto inferior por semana',
      options: [
        {
          value: 'presente',
          points: 1,
          label: 'Presente (não pratica atividade física ou atividades apenas esporádicas)',
        },
        {
          value: 'ausente',
          points: 0,
          label: 'Ausente (ativo fisicamente, caminhadas regulares ou exercícios)',
        },
      ],
    },
  ],
}

export function calculateFried(answers: Record<string, string>): AssessmentCalculationResult {
  const questions = FRIED_INSTRUMENT.questions
  let score = 0
  let answered = 0
  const lines: string[] = []

  questions.forEach((q) => {
    const val = answers[q.id]
    if (val !== undefined && val !== '') {
      answered++
      const opt = q.options.find((o) => o.value === val)
      const pts = opt?.points ?? 0
      score += pts
      const isPres = pts === 1
      lines.push(
        `- **${q.title.replace(/^\d+\.\s*/, '')}**: ${isPres ? '⚠️ Presente' : '✅ Ausente'}`,
      )
    }
  })

  let classification = ''
  let tone: 'normal' | 'warning' | 'danger' = 'normal'
  let interpretation = ''

  if (score === 0) {
    classification = 'Robusto (0 critérios)'
    tone = 'normal'
    interpretation =
      'Nenhum critério de fragilidade presente. Reserva fisiológica preservada com baixo risco imediato de declínio funcional.'
  } else if (score <= 2) {
    classification = `Pré-frágil (${score} ${score === 1 ? 'critério' : 'critérios'})`
    tone = 'warning'
    interpretation =
      'Presença de 1 a 2 critérios do fenótipo. Estágio intermediário com alto potencial de reversibilidade mediante intervenção nutricional, exercícios resistidos e revisão de polifarmácia.'
  } else {
    classification = `Frágil (${score} critérios)`
    tone = 'danger'
    interpretation =
      'Presença de 3 ou mais critérios de fragilidade. Elevado risco de quedas, hospitalização, declínio funcional acelerado e iatrogenia. Indicação formal de plano de cuidados intensivo.'
  }

  const isComplete = answered === questions.length

  const summaryMarkdown = `### Avaliação de Fragilidade — Fenótipo de Fried
**Data:** ${new Date().toLocaleDateString('pt-BR')}
**Critérios Positivos:** ${score}/5 critérios (${answered}/${questions.length} respondidos)
**Classificação:** **${classification}**

**Detalhamento dos Critérios:**
${lines.join('\n')}

**Conduta Clínica Recomendada:**
${interpretation}

*Referência: Fried LP et al., J Gerontol A Biol Sci Med Sci 2001.*`

  return {
    scoreNumber: score,
    scoreDisplay: `${score}/5 critérios`,
    classification,
    classificationTone: tone,
    interpretation,
    summaryMarkdown,
    answeredCount: answered,
    totalCount: questions.length,
    isComplete,
  }
}

// -----------------------------------------------------------------------------
// 5. ESCALA DE RISCO DE QUEDA (Algoritmo aberto estilo STEADI / Moritz - 12 perguntas sim/não)
// Baseado no "Stay Independent" do STEADI / CDC (material de domínio público oficial dos EUA)
// Pontuação >= 4 pontos indica Risco Aumentado de Quedas.
// -----------------------------------------------------------------------------
export const FALL_RISK_INSTRUMENT: InstrumentDefinition = {
  type: 'fall_risk',
  title: 'Avaliação de Risco de Quedas (Questionário STEADI / CDC)',
  shortTitle: 'Risco de Queda',
  subtitle:
    'Triagem aberta de fatores de risco intrínsecos e comportamentais para quedas em idosos',
  reference:
    'CDC STEADI: Stopping Elderly Accidents, Deaths, & Injuries. U.S. Centers for Disease Control and Prevention (Public Domain).',
  copyrightNote: 'Conteúdo do programa STEADI do CDC americano, de domínio público governamental.',
  maxScoreDisplay: '0 a 14 pontos (pontuação >= 4 indica risco elevado de quedas)',
  questions: [
    {
      id: 'queda_recente',
      title: '1. Histórico de Quedas no Último Ano',
      description: 'Caiu no último ano?',
      options: [
        {
          value: 'sim',
          points: 2,
          label: 'Sim (2 pontos)',
          description: 'Caiu uma ou mais vezes no último ano',
        },
        { value: 'nao', points: 0, label: 'Não (0 pontos)' },
      ],
    },
    {
      id: 'medicacao_sono',
      title: '2. Medicamentos Sedativos / Hipnóticos',
      description: 'Usa medicamentos para dormir, relaxantes musculares ou calmantes?',
      options: [
        { value: 'sim', points: 2, label: 'Sim (2 pontos)' },
        { value: 'nao', points: 0, label: 'Não (0 pontos)' },
      ],
    },
    {
      id: 'tontura',
      title: '3. Tontura ou Hipotensão Postural',
      description: 'Sente tontura ou sensação de desmaio ao levantar-se da cama ou da cadeira?',
      options: [
        { value: 'sim', points: 1, label: 'Sim (1 ponto)' },
        { value: 'nao', points: 0, label: 'Não (0 pontos)' },
      ],
    },
    {
      id: 'apoio_andar',
      title: '4. Necessidade de Apoio para Deambular',
      description:
        'Precisa segurar nos móveis, paredes ou usar bengala/andador para caminhar com firmeza?',
      options: [
        { value: 'sim', points: 2, label: 'Sim (2 pontos)' },
        { value: 'nao', points: 0, label: 'Não (0 pontos)' },
      ],
    },
    {
      id: 'levantar_cadeira',
      title: '5. Dificuldade ao Levantar da Cadeira',
      description: 'Precisa usar os braços para empurrar o assento ao levantar de uma cadeira?',
      options: [
        { value: 'sim', points: 1, label: 'Sim (1 ponto)' },
        { value: 'nao', points: 0, label: 'Não (0 pontos)' },
      ],
    },
    {
      id: 'subir_degraus',
      title: '6. Dificuldade com Degraus e Calçadas',
      description: 'Apresenta dificuldade para subir um degrau ou meio-fio sem apoio?',
      options: [
        { value: 'sim', points: 1, label: 'Sim (1 ponto)' },
        { value: 'nao', points: 0, label: 'Não (0 pontos)' },
      ],
    },
    {
      id: 'pressa_banheiro',
      title: '7. Urgência Miccional / Pressa para o Banheiro',
      description:
        'Com frequência precisa correr ou ter muita pressa para chegar ao vaso sanitário?',
      options: [
        { value: 'sim', points: 1, label: 'Sim (1 ponto)' },
        { value: 'nao', points: 0, label: 'Não (0 pontos)' },
      ],
    },
    {
      id: 'sensibilidade_pes',
      title: '8. Perda de Sensibilidade nos Pés',
      description: 'Sente os pés dormentes, formigando ou com sensibilidade diminuída?',
      options: [
        { value: 'sim', points: 1, label: 'Sim (1 ponto)' },
        { value: 'nao', points: 0, label: 'Não (0 pontos)' },
      ],
    },
    {
      id: 'medo_cair',
      title: '9. Medo de Cair (Ptofobia)',
      description: 'Preocupa-se com frequência em cair, a ponto de limitar passeios ou atividades?',
      options: [
        { value: 'sim', points: 1, label: 'Sim (1 ponto)' },
        { value: 'nao', points: 0, label: 'Não (0 pontos)' },
      ],
    },
    {
      id: 'visao',
      title: '10. Alteração Visual não Corrigida',
      description: 'Dificuldade para enxergar obstáculos ou degraus mesmo com óculos?',
      options: [
        { value: 'sim', points: 1, label: 'Sim (1 ponto)' },
        { value: 'nao', points: 0, label: 'Não (0 pontos)' },
      ],
    },
    {
      id: 'antidepressivos',
      title: '11. Uso de Medicações Psicotrópicas',
      description: 'Usa medicamentos antidepressivos, anticonvulsivantes ou antipsicóticos?',
      options: [
        { value: 'sim', points: 1, label: 'Sim (1 ponto)' },
        { value: 'nao', points: 0, label: 'Não (0 pontos)' },
      ],
    },
  ],
}

export function calculateFallRisk(answers: Record<string, string>): AssessmentCalculationResult {
  const questions = FALL_RISK_INSTRUMENT.questions
  let score = 0
  let answered = 0
  const lines: string[] = []

  questions.forEach((q) => {
    const val = answers[q.id]
    if (val !== undefined && val !== '') {
      answered++
      const opt = q.options.find((o) => o.value === val)
      const pts = opt?.points ?? 0
      score += pts
      if (pts > 0) {
        lines.push(
          `- **${q.title.replace(/^\d+\.\s*/, '')}**: Sim (+${pts} ${pts === 1 ? 'pt' : 'pts'})`,
        )
      }
    }
  })

  let classification = ''
  let tone: 'normal' | 'warning' | 'danger' = 'normal'
  let interpretation = ''

  if (score < 4) {
    classification = `Baixo Risco de Queda (${score} pts)`
    tone = 'normal'
    interpretation =
      'Escore < 4. Baixo risco aparente de quedas no momento. Manter orientações gerais de prevenção ambiental e incentivo à atividade física.'
  } else if (score < 8) {
    classification = `Risco Moderado de Queda (${score} pts)`
    tone = 'warning'
    interpretation =
      'Escore >= 4. Risco significativo de quedas identificado. Recomenda-se avaliação detalhada de marcha (Timed Up and Go), revisão de psicotrópicos, adequação de calçados e fisioterapia de equilíbrio.'
  } else {
    classification = `Alto Risco de Queda (${score} pts)`
    tone = 'danger'
    interpretation =
      'Escore elevado (>= 8). Múltiplos fatores de risco somados. Alta probabilidade de quedas repetidas e fraturas. Prioridade absoluta para plano de prevenção multifatorial e intervenção domiciliar.'
  }

  const isComplete = answered === questions.length

  const summaryMarkdown = `### Avaliação de Risco de Quedas (STEADI / CDC)
**Data:** ${new Date().toLocaleDateString('pt-BR')}
**Pontuação:** ${score} pontos (${answered}/${questions.length} itens avaliados)
**Classificação:** **${classification}**

**Fatores de Risco Identificados:**
${lines.length > 0 ? lines.join('\n') : '- Nenhum fator de risco positivo assinalado.'}

**Conduta Preventiva Recomendada:**
${interpretation}

*Referência: CDC STEADI — Stay Independent Tool (corte >= 4).*`

  return {
    scoreNumber: score,
    scoreDisplay: `${score} pts`,
    classification,
    classificationTone: tone,
    interpretation,
    summaryMarkdown,
    answeredCount: answered,
    totalCount: questions.length,
    isComplete,
  }
}

// -----------------------------------------------------------------------------
// Mapa unificado dos instrumentos
// -----------------------------------------------------------------------------
export const GERIATRIC_INSTRUMENTS: Record<GeriatricInstrumentType, InstrumentDefinition> = {
  katz: KATZ_INSTRUMENT,
  lawton: LAWTON_INSTRUMENT,
  g8: G8_INSTRUMENT,
  fried: FRIED_INSTRUMENT,
  fall_risk: FALL_RISK_INSTRUMENT,
}

export function calculateInstrumentScore(
  type: GeriatricInstrumentType,
  answers: Record<string, string>,
): AssessmentCalculationResult {
  switch (type) {
    case 'katz':
      return calculateKatz(answers)
    case 'lawton':
      return calculateLawton(answers)
    case 'g8':
      return calculateG8(answers)
    case 'fried':
      return calculateFried(answers)
    case 'fall_risk':
      return calculateFallRisk(answers)
    default:
      throw new Error(`Instrumento desconhecido: ${type}`)
  }
}
