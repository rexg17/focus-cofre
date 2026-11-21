import sys,os,threading,json,subprocess,tempfile
os.environ.setdefault('COFRE_DATA_DIR',tempfile.mkdtemp())
R=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0,R);sys.path.insert(0,R+'/tests')
import app,db
from fake_anthropic import Fake
fake=Fake();os.environ['COFRE_LLM_BASE_URL']=fake.url
db.connect().close()
db.daily_backup()
srv=app.make_server('tkn-e2e',db.db_path(),port=8765)
threading.Thread(target=srv.serve_forever,daemon=True).start()
r=subprocess.run(['node',sys.argv[1] if len(sys.argv)>1 else os.path.join(R,'tests','e2e','llm_chat.js')],capture_output=True,text=True);print(r.stdout,r.stderr[-600:])
todas=json.dumps([q['corpo'] for q in fake.requisicoes],ensure_ascii=False)
print('requisições ao Claude:',len(fake.requisicoes))
print('vazou descrição/nome?', any(s in todas for s in ('SEGREDO-CLIENTE','SEGREDO-DESC','Banco Secreto')))
if fake.requisicoes:
    seg=fake.requisicoes[-1]['corpo']['messages']
    print('2ª requisição repete o bloco de raciocínio intacto:', any(isinstance(m['content'],list) and any(b.get('type')=='thinking' and b.get('signature')=='assinatura-xyz' for b in m['content']) for m in seg))
    tr=[b for m in seg if isinstance(m['content'],list) for b in m['content'] if b.get('type')=='tool_result']
    print('tool_result veio do cálculo local:', bool(tr) and 'renda_mensal' in tr[0]['content'] and 'caixa' in tr[0]['content'])
    print('chave guardada em arquivo e não no estado:', 'sk-ant-e2e-123456' in open(db.settings_path()).read(), '|', 'sk-ant-e2e' in json.dumps(db.load_state(db.connect())))
fake.parar()
