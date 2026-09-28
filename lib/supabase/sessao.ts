// Duração do cookie de sessão da Equipe: 12 horas. Ele é renovado a cada uso (a sessão do Supabase se
// renova sozinha), então quem está trabalhando continua logado; um painel esquecido pede o login de novo.
export const SESSAO_SEGUNDOS = 12 * 60 * 60
export const cookieOptions = { maxAge: SESSAO_SEGUNDOS }
