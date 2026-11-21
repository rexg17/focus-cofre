# Segurança e privacidade

## Modelo de ameaça

O app é local: o risco principal é **outra página ou programa tentar usar o servidor local** ou **dados saírem do
computador sem você saber**. Não é um objetivo defender contra malware que já roda como o mesmo usuário.

## Servidor local

| Ameaça | Defesa |
|---|---|
| Site externo chamando `127.0.0.1` | Sem cabeçalhos CORS (o navegador bloqueia a leitura) e **token por sessão** obrigatório (`X-Cofre-Token`), comparado em tempo constante |
| *DNS rebinding* | O cabeçalho `Host` precisa ser `127.0.0.1` ou `localhost` |
| *Path traversal* nos arquivos estáticos | O caminho é resolvido e precisa estar dentro de `web/`, com extensões permitidas (testado: `/js/../../app.py` → 404) |
| Entrada maliciosa ou corrompida | Validação estrita de tipos, tamanhos e valores (`db.save_state`); limites de corpo (estado 20 MB, IA 2 MB, restaurar 10 KB) |
| Injeção de SQL | Somente consultas parametrizadas; nomes de tabela são constantes |
| Restauração de arquivo arbitrário | Nome do backup validado por expressão regular (`cofre-AAAA-MM-DD.db`), verificação de integridade e cópia de segurança antes de restaurar |

O servidor não registra o conteúdo das requisições.

## Chave da API do Claude

- Guardada em `settings.json`, na pasta de dados do usuário, com permissão `0600` onde houver suporte.
- **Nunca** vai para o navegador: `/api/settings` só informa se existe uma chave. Também não entra no estado nem no backup.
- Limitação: o arquivo é texto simples. Ative a criptografia do disco (BitLocker).

## O que é enviado à IA (e o que não é)

**Enviado:** as mensagens que você digita e os resultados das 10 ferramentas: totais, médias, prazos, progresso e
nomes de categorias.
**Nunca enviado:** nomes de clientes, descrições de lançamentos, nomes de contas ou de dívidas, a chave da API e o
banco de dados. Há um teste de ponta a ponta que cadastra textos "secretos" e confere que nenhum deles aparece em
nenhuma requisição à API.
A tela mostra, em "O que o app envia para a IA", a última requisição.
Mensagens digitadas por você são texto livre: o que você escrever vai junto.

## Dados em repouso e backups

O banco **não é criptografado** pelo app. Backups diários (14 últimos) ficam na pasta de dados; uma pasta extra
(OneDrive, Dropbox, pen drive) pode ser configurada. Quem sincroniza essa pasta com a nuvem passa a ter os dados lá.

## Lacunas conhecidas

- Sem criptografia do banco (recomendado: criptografia de disco).
- Binário sem assinatura digital: o SmartScreen avisa na primeira execução.
- Sem autenticação entre processos locais do mesmo usuário.
- Alíquotas e requisitos de plataformas são referência educativa e podem estar desatualizados.
