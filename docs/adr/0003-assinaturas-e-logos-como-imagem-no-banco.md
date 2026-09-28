# Assinaturas e logos guardados como imagem dentro do banco

A Assinatura (PNG de ~20–40 KB) e o logo do Projeto ficam como *data URL* em colunas de texto, e não no Storage do Supabase. Assim a Presença chega completa ao painel pelo tempo real, sem URLs assinadas nem um segundo sistema de permissões. O Documento da Lista também é montado em uma única consulta. O custo é o espaço no banco (500 MB no plano gratuito, algo como 15 mil Presenças), por isso a Assinatura tem limite de tamanho e cada Lista de Presença tem um teto de Presenças.
