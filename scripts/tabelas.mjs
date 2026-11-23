// Todas as tabelas do Presente, na ordem das migrações (supabase/migrations). Usada pelo backup e pelo `npm run check`.
// Tabela nova: acrescente aqui, senão ela fica de fora do backup.
export const TABELAS = [
  'staff', 'projects', 'trainings', 'attendances',                                                  // 0001
  'schools', 'el_vinculos', 'el_ciclos', 'el_respostas', 'el_dispensas', 'el_contatos', 'el_fechamentos', // 0004
  'av_respostas',                                                                                  // 0005
  'plano_capacitacoes',                                                                            // 0008
  'registro_acesso',                                                                               // 0010
]
