/**
 * Avaliação da formação → Central (Presente).
 * Colado no Google Forms "Avaliação - Formação de Professores" (Extensões → Apps Script), na conta de quem é dona do formulário.
 * Envia cada avaliação para a Central assim que o professor responde. Passo a passo em COMO-INSTALAR.md.
 *
 *   instalar()                → cria o envio automático (rodar uma vez)
 *   enviarTodasAsRespostas()  → manda as respostas que já existem (pode repetir: a Central não duplica)
 */
var CENTRAL_URL = 'https://presente.presente.workers.dev/api/avaliacao/formulario';

/** Rodar uma vez: a partir daqui, cada nova resposta vai sozinha para a Central. */
function instalar() {
  var form = FormApp.getActiveForm();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'aoEnviar') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('aoEnviar').forForm(form).onFormSubmit().create();
  segredo_(); // avisa já na instalação se o segredo não foi configurado
  Logger.log('Pronto: cada nova resposta será enviada para a Central.');
}

/** Chamado pelo Google a cada envio do formulário. Se falhar, o Google avisa por e-mail. */
function aoEnviar(e) {
  enviar_(e.response);
}

/** Manda todas as respostas que já existem no formulário. Pode rodar de novo sem duplicar. */
function enviarTodasAsRespostas() {
  var respostas = FormApp.getActiveForm().getResponses();
  var ok = 0, erros = [];
  respostas.forEach(function (r, i) {
    try { enviar_(r); ok++; } catch (err) { erros.push('resposta ' + (i + 1) + ': ' + err.message); }
  });
  Logger.log(ok + ' de ' + respostas.length + ' respostas enviadas.' + (erros.length ? '\nCom erro:\n' + erros.join('\n') : ''));
}

function enviar_(resposta) {
  // os dois primeiros campos são os que a planilha de respostas do Forms também teria
  var titulos = ['Carimbo de data/hora', 'Endereço de e-mail'];
  var valores = [resposta.getTimestamp().toISOString(), resposta.getRespondentEmail() || ''];
  resposta.getItemResponses().forEach(function (ir) {
    titulos.push(ir.getItem().getTitle());
    valores.push(texto_(ir.getItem(), ir.getResponse()));
  });
  var r = UrlFetchApp.fetch(CENTRAL_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + segredo_() },
    payload: JSON.stringify({ titulos: titulos, valores: valores, referencia: resposta.getId() }),
    muteHttpExceptions: true
  });
  if (r.getResponseCode() >= 300) throw new Error('a Central respondeu ' + r.getResponseCode() + ': ' + r.getContentText());
}

/** Anexos viram links do Drive; perguntas de várias escolhas viram texto separado por vírgula. */
function texto_(item, valor) {
  if (item.getType() === FormApp.ItemType.FILE_UPLOAD) {
    return [].concat(valor).map(function (id) { return 'https://drive.google.com/open?id=' + id; }).join(', ');
  }
  if (Array.isArray(valor)) return valor.map(function (x) { return Array.isArray(x) ? x.join(' / ') : x; }).join(', ');
  return valor === null || valor === undefined ? '' : String(valor);
}

function segredo_() {
  var s = PropertiesService.getScriptProperties().getProperty('SEGREDO_CENTRAL');
  if (!s) throw new Error('Falta configurar o SEGREDO_CENTRAL (Configurações do projeto → Propriedades do script).');
  return s;
}
