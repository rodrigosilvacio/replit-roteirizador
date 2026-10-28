# Rota — Planejador de rotas

Aplicação web em português para calcular trajetos de carro, organizar até **10 paradas intermediárias** e consultar as instruções do motorista abaixo do mapa.

## 1. Funcionalidades

- Busca de endereços com sugestões.
- Origem, destino e localização atual do navegador, mediante permissão.
- Adição, edição, remoção e reordenação de paradas.
- Cálculo na ordem informada ou otimização por tempo estimado.
- Retorno ao ponto de partida.
- Mapa com percurso e marcadores das visitas.
- Comparação entre a rota original e a escolhida.
- Instruções em português, separadas por trecho, com ruas, conversões e distâncias.
- Abertura no Google Maps, dividindo viagens longas em trechos para preservar as paradas.
- Interface adaptada a celulares e computadores.

## 2. Stack utilizada

### Frontend

| Tecnologia | Responsabilidade |
| --- | --- |
| React + TypeScript | Componentes, estado da interface e tipos |
| Vite | Servidor de desenvolvimento e build do frontend |
| Tailwind CSS | Estilos e comportamento responsivo |
| TanStack Query | Requisições, cache de consultas e estados de carregamento |
| Wouter | Roteamento da interface |
| Leaflet | Mapa interativo, marcadores e desenho do percurso |
| Lucide React | Ícones |

### Backend e contratos

| Tecnologia | Responsabilidade |
| --- | --- |
| Node.js + TypeScript | Execução da API |
| Express | Endpoints HTTP |
| Zod | Validação das entradas e respostas |
| OpenAPI | Contrato compartilhado da API |
| Orval | Geração de tipos, hooks e validadores a partir do contrato |
| Pino | Logs estruturados do servidor |
| esbuild | Build do backend |
| pnpm workspaces | Organização dos aplicativos e bibliotecas no mesmo repositório |

### Serviços de mapas

| Serviço | Uso |
| --- | --- |
| OpenStreetMap | Dados cartográficos e imagens do mapa |
| Photon (`photon.komoot.io`) | Pesquisa de endereços e coordenadas |
| OSRM via `routing.openstreetmap.de/routed-car` | Rotas de carro, matriz de tempos e etapas do percurso |
| Google Maps | Navegação externa por links; não calcula a rota exibida dentro do Rota |

**Não há login nem persistência de viagens nesta versão.** O repositório contém uma biblioteca preparada para PostgreSQL/Drizzle, mas o fluxo atual de roteirização não utiliza banco de dados. Dependências do scaffold não significam que todas estejam em uso no produto.

## 3. Estrutura do projeto

```text
artifacts/
  rota/                          # Aplicação React
    src/pages/home.tsx           # Formulário e estado do planejamento
    src/components/
      place-input.tsx            # Busca e seleção de endereços
      route-map.tsx              # Mapa e percurso
      route-result.tsx           # Resumo, comparação e links de navegação
      route-directions.tsx       # Instruções abaixo do mapa
  api-server/                    # API Express
    src/routes/routing.ts        # Busca de locais e cálculo de rotas
    src/lib/
      route-optimizer.ts         # Otimização da ordem das paradas
      route-optimizer.test.ts    # Testes do algoritmo
      directions.ts              # Instruções de manobras em português
  mockup-sandbox/                 # Ambiente auxiliar de prévias visuais
lib/
  api-spec/openapi.yaml           # Fonte de verdade do contrato HTTP
  api-client-react/               # Cliente e hooks gerados
  api-zod/                        # Validadores gerados
  db/                             # Estrutura de banco não usada pelo roteirizador
```

## 4. Passo a passo para executar

### Passo 1 — Preparar as dependências

Use Node.js 24 e pnpm, compatíveis com o ambiente do projeto.

Na raiz do repositório:

```bash
pnpm install
```

Não use npm ou Yarn neste workspace. O projeto possui uma verificação de instalação que exige pnpm.

### Passo 2 — Gerar os contratos

```bash
pnpm --filter @workspace/api-spec run codegen
```

Esse comando gera os hooks React, os tipos e os validadores Zod, além de verificar os tipos das bibliotecas.

Execute novamente sempre que alterar `lib/api-spec/openapi.yaml`. Não edite manualmente os arquivos gerados.

### Passo 3 — Iniciar os serviços configurados

No ambiente deste projeto, utilize os workflows já configurados:

| Workflow | Comando executado |
| --- | --- |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` |
| `artifacts/rota: web` | `pnpm --filter @workspace/rota run dev` |

O workflow do sandbox visual não é necessário para utilizar o Rota.

Os serviços usam `PORT`; o frontend também exige `BASE_PATH`. As configurações do projeto fornecem esses valores. Não execute os comandos isoladamente sem as variáveis necessárias.

O acesso pelo endereço da aplicação encaminha:

- `/` para o frontend.
- `/api` para a API.

**Execução fora deste ambiente:** é necessário fornecer as variáveis e configurar um proxy que mantenha esses dois caminhos no mesmo endereço. Apenas iniciar dois servidores em portas distintas não conecta automaticamente o frontend à API.

### Passo 4 — Abrir a aplicação

Abra a prévia do Rota. A tela inicial mostra os campos de origem e destino, as opções de paradas e o mapa.

### Passo 5 — Verificar o código

```bash
# Verificação de tipos de todo o workspace
pnpm run typecheck

# Testes específicos do algoritmo de otimização
node --experimental-strip-types --test artifacts/api-server/src/lib/route-optimizer.test.ts
```

Os testes do algoritmo não substituem a verificação da interface ou da disponibilidade dos provedores externos.

### Passo 6 — Entender os builds

```bash
# Backend
pnpm --filter @workspace/api-server run build

# Frontend: requer PORT e BASE_PATH fornecidos pelo ambiente
pnpm --filter @workspace/rota run build
```

O backend gera arquivos em `artifacts/api-server/dist`. O frontend gera arquivos estáticos em `artifacts/rota/dist/public`. Os serviços de produção estão descritos nos respectivos arquivos `.replit-artifact/artifact.toml`.

## 5. Passo a passo para usar

1. Digite o endereço de **partida** e selecione uma sugestão.
2. Informe o **destino** ou marque **Voltar ao ponto de partida**.
3. Se necessário, clique em **Adicionar parada** e selecione os endereços.
4. Use os controles de subir, descer ou remover para ajustar as paradas.
5. Escolha **Na ordem digitada** ou **Otimizar por tempo**. Sem paradas, a ação principal é **Traçar rota**. A otimização da ordem fica disponível com pelo menos duas paradas confirmadas.
6. Confira o mapa, a sequência escolhida e os totais de distância e duração.
7. Consulte **Trajeto do motorista**, abaixo do mapa. Cada trecho pode ser expandido ou recolhido.
8. Para navegação externa, abra o Google Maps. Quando houver vários links, percorra os trechos na sequência indicada.

Editar os endereços, a ordem ou a opção de retorno invalida o resultado anterior. É necessário calcular novamente.

## 6. Como o cálculo funciona

1. O frontend consulta `GET /api/places?q=...`.
2. A API pesquisa no Photon e retorna endereço, latitude e longitude.
3. O usuário confirma os locais e solicita o cálculo.
4. O frontend envia `POST /api/route` com origem, destino, paradas e a opção de otimizar.
5. A API valida os dados e calcula o trajeto original no OSRM.
6. Quando solicitado e houver ao menos duas paradas, consulta uma matriz de tempos entre os pontos.
7. O algoritmo Held–Karp procura a ordem de menor custo nessa matriz, mantendo os extremos fixos. Os tempos são direcionais: ir de A para B pode custar diferente de ir de B para A.
8. A API calcula o trajeto completo da ordem candidata e compara sua duração com a rota original.
9. Só adota a candidata se a duração completa for menor. Caso contrário, preserva a ordem informada.
10. A resposta contém geometria, sequência, métricas e instruções de cada trecho. A interface apresenta tudo sem substituir o resultado atual por respostas atrasadas de cálculos anteriores.

Embora a busca seja exata para a matriz limitada a dez paradas, isso **não garante o melhor trajeto real em todas as condições**. Tempos entre pares e trajetos completos podem diferir por manobras, e não há informação de trânsito ao vivo.

## 7. API principal

### `GET /api/healthz`

Verifica se a API está respondendo.

### `GET /api/places?q=...`

Recebe um texto de busca de 3 a 200 caracteres. Retorna uma lista de:

```json
{
  "label": "Endereço encontrado",
  "lat": -23.5503,
  "lon": -46.6339
}
```

### `POST /api/route`

Exemplo de corpo:

```json
{
  "origin": { "label": "Praça da Sé", "lat": -23.5503, "lon": -46.6339 },
  "destination": { "label": "Estação da Luz", "lat": -23.5346, "lon": -46.6351 },
  "stops": [
    { "label": "Ibirapuera", "lat": -23.5874, "lon": -46.6576 },
    { "label": "MASP", "lat": -23.5614, "lon": -46.6559 }
  ],
  "optimize": true
}
```

Campos importantes da resposta:

- `distance`: distância total em metros.
- `duration`: duração estimada em segundos.
- `coordinates`: pares **longitude, latitude** para o percurso.
- `orderedPlaces`: origem, paradas na ordem escolhida e destino.
- `originalDistance` e `originalDuration`: totais da ordem informada.
- `improved`: indica redução do tempo em relação à ordem original.
- `legs`: trechos entre visitas, com distância, duração e `steps`.
- `steps`: instruções em português e distância a percorrer após cada manobra.

Erros de entrada retornam HTTP 400; ausência de rota completa, 422; indisponibilidade do provedor, 503. As mensagens ficam no campo `error`.

## 8. Limitações e cuidados

- Somente trajetos de carro; não há perfis de caminhão, bicicleta ou pedestre.
- Até dez paradas intermediárias, além da origem e do destino.
- Sem trânsito ao vivo, horários de atendimento, capacidade de veículo ou tempo de serviço.
- Otimizar tempo pode aumentar a distância; economia de distância não é garantida.
- Serviços públicos externos podem ficar lentos ou indisponíveis e não oferecem garantia de disponibilidade para esta aplicação.
- A implementação atual não exige chaves de API para mapas, endereços e rotas.
- Endereços pesquisados são enviados ao Photon; coordenadas dos trajetos, ao provedor OSRM. O navegador solicita imagens de mapa ao OpenStreetMap. Ao abrir a navegação externa, o trajeto é enviado ao Google Maps.
- O servidor mantém um cache temporário e limitado de buscas de endereços, não um histórico persistente de viagens.
- Recarregar a página perde o planejamento atual.
- As instruções são para consulta, sem voz ou acompanhamento contínuo do motorista. Respeite a sinalização local.
- Antes de aumentar o volume de uso, avalie os termos, limites e capacidade dos provedores.

## 9. Como evoluir o código

1. Altere primeiro o contrato OpenAPI quando houver mudanças de entrada ou saída.
2. Execute o comando de geração dos contratos.
3. Implemente a validação e a lógica no backend.
4. Atualize a interface usando os tipos e hooks gerados.
5. Preserve a correspondência entre a rota escolhida, os marcadores, as instruções e os links de navegação.
6. Execute a verificação de tipos e os testes aplicáveis.
7. Reinicie os serviços alterados e confira a aplicação.

Nunca coloque credenciais ou dados privados no README ou em arquivos versionados.
