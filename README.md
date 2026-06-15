# Projeto Criado com o Skip

Este projeto foi criado de ponta a ponta com o [Skip](https://goskip.dev).

## 🚀 Stack Tecnológica

- **React 19** - Biblioteca JavaScript para construção de interfaces
- **Vite** - Build tool extremamente rápida
- **TypeScript** - Superset tipado do JavaScript
- **Shadcn UI** - Componentes reutilizáveis e acessíveis
- **Tailwind CSS** - Framework CSS utility-first
- **React Router** - Roteamento para aplicações React
- **React Hook Form** - Gerenciamento de formulários performático
- **Zod** - Validação de schemas TypeScript-first
- **Recharts** - Biblioteca de gráficos para React

## Integrações e regras de agendamento

- Google Calendar usa OAuth do Google Console. Configure `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` nos secrets/envs do Skip, depois conecte cada consultor no admin. `GOOGLE_REDIRECT_URI` é opcional: se não existir, o backend monta automaticamente `/backend/v1/google/oauth/callback` a partir do host da requisição. Mesmo assim, essa callback precisa estar cadastrada em `Authorized redirect URIs` no Google Console.
- Tally deve ser salvo no programa como template de URL em `tally_form_template`. O formulário padrão é `https://tally.so/r/wdRX0N`. Placeholders aceitos no link: `{clients_email}`, `{client_email}`, `{email}`, `{clients_name}`, `{client_name}`, `{firstname}` e `{first_name}`.
- Para marcar automaticamente `form_answered`, configure no Tally do formulário `wdRX0N` um webhook `POST` para `https://agendamento-ia-reunioes-6b454.shrd00.internal.goskip.dev/backend/v1/tally/webhook`. O secret do webhook deve ser o mesmo valor salvo em `TALLY_SIGNING_SECRET`.
- A antecedência mínima de cancelamento/remarcação fica em `min_reschedule_hours`.
- Se o cliente tentar remarcar dentro desse prazo, a remarcação continua possível, mas o novo horário só aparece a partir de `late_reschedule_delay_days` dias depois. Cancelamento dentro do prazo segue bloqueado.

## 📋 Pré-requisitos

- Node.js 18+
- npm

## 🔧 Instalação

```bash
npm install
```

## 💻 Scripts Disponíveis

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm start
# ou
npm run dev
```

Abre a aplicação em modo de desenvolvimento em [http://localhost:5173](http://localhost:5173).

### Build

```bash
# Build para produção
npm run build

# Build para desenvolvimento
npm run build:dev
```

Gera os arquivos otimizados para produção na pasta `dist/`.

### Preview

```bash
# Visualizar build de produção localmente
npm run preview
```

Permite visualizar a build de produção localmente antes do deploy.

### Linting e Formatação

```bash
# Executar linter
npm run lint

# Executar linter e corrigir problemas automaticamente
npm run lint:fix

# Formatar código com Oxfmt
npm run format
```

## 📁 Estrutura do Projeto

```
.
├── src/              # Código fonte da aplicação
├── public/           # Arquivos estáticos
├── dist/             # Build de produção (gerado)
├── node_modules/     # Dependências (gerado)
└── package.json      # Configurações e dependências do projeto
```

## 🎨 Componentes UI

Este template inclui uma biblioteca completa de componentes Shadcn UI baseados em Radix UI:

- Accordion
- Alert Dialog
- Avatar
- Button
- Checkbox
- Dialog
- Dropdown Menu
- Form
- Input
- Label
- Select
- Switch
- Tabs
- Toast
- Tooltip
- E muito mais...

## 📝 Ferramentas de Qualidade de Código

- **TypeScript**: Tipagem estática
- **Oxlint**: Linter extremamente rápido
- **Oxfmt**: Formatação automática de código

## 🔄 Workflow de Desenvolvimento

1. Instale as dependências: `npm install`
2. Inicie o servidor de desenvolvimento: `npm start`
3. Faça suas alterações
4. Verifique o código: `npm run lint`
5. Formate o código: `npm run format`
6. Crie a build: `npm run build`
7. Visualize a build: `npm run preview`

## 📦 Build e Deploy

Para criar uma build otimizada para produção:

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/` e estarão prontos para deploy.
