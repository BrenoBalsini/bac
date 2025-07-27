<h1>BAC - Otimizador de Escalas de Salva-Vidas</h1>

<p>
    Um sistema inteligente para automatizar e otimizar a complexa tarefa de criar escalas de serviço para salva-vidas, transformando horas de trabalho manual em um processo de poucos cliques.
</p>

<p>
    <strong><a href="[https://SEU-USUARIO.github.io/SEU-REPOSITORIO/](https://brenobalsini.github.io/bac/)" target="_blank" rel="noopener noreferrer">➡️ Acesse a demonstração ao vivo aqui</a></strong><br>
</p>

<hr>

<h2>Sobre o Projeto</h2>
<p>
    Este projeto nasceu de uma necessidade real: substituir uma planilha de Excel complexa, demorada e propensa a erros por uma solução web moderna, rápida e inteligente. O BAC é uma Single Page Application (SPA) projetada para gerar escalas de serviço quinzenais para equipes de salva-vidas, respeitando um conjunto rigoroso de regras de negócio.
</p>
<p>
    O aplicativo guia o gestor através de um assistente passo a passo, coletando todas as variáveis necessárias — desde as cotas de trabalho por grupo até as folgas solicitadas individualmente — e utiliza um algoritmo customizado para produzir uma escala final justa, eficiente e transparente.
</p>
<p>
  <img width="1583" height="734" alt="image" src="https://github.com/user-attachments/assets/7fe3ec7a-0c71-4c6e-8b47-799a396f44a5" />
</p>

<h2>Funcionalidades Principais</h2>
<ul>
    <li><strong>Wizard de Geração de Escala:</strong> Uma interface passo a passo que simplifica a configuração da quinzena (regras, vagas e folgas).</li>
    <li><strong>Gerenciamento de Dados:</strong> Páginas dedicadas para o CRUD de Salva-Vidas e Postos, com persistência de dados no Local Storage.</li>
    <li><strong>Seleção de Preferências:</strong> Definição intuitiva das preferências de posto (A e B) diretamente na tabela de efetivo.</li>
    <li><strong>Algoritmo de Geração V2:</strong>
        <ul>
            <li><strong>Prioridade de Grupos:</strong> O sistema processa e garante a escala completa do grupo prioritário (G1) antes de alocar o grupo de apoio (G2).</li>
            <li><strong>Diárias:</strong> Utiliza um sistema de pontuação para encontrar a combinação ótima de dias de trabalho para cada indivíduo, resultando em folgas mais bem distribuídas.</li>
            <li><strong>Distribuição Inteligente:</strong> Evita agrupar membros do G1 no mesmo posto no mesmo dia, espalhando a experiência pela praia.</li>
            <li><strong>Folgas Compulsórias (FC):</strong> Atribui folgas de forma inteligente para garantir que ninguém ultrapasse a cota de trabalho.</li>
        </ul>
    </li>
    <li><strong>Histórico e Edição:</strong>
        <ul>
            <li>As escalas geradas podem ser salvas em um histórico.</li>
            <li>É possível visualizar, fazer ajustes manuais em uma escala salva e salvá-la como uma nova versão, preservando o original.</li>
        </ul>
    </li>
</ul>

<h2>🛠Tecnologias Utilizadas</h2>
<ul>
    <li><strong>React:</strong> Biblioteca principal para a construção da interface.</li>
    <li><strong>TypeScript:</strong> Para um código mais seguro, legível e escalável.</li>
    <li><strong>Vite:</strong> Ferramenta de build extremamente rápida para o desenvolvimento.</li>
    <li><strong>Tailwind CSS:</strong> Para a estilização ágil e consistente da interface.</li>
    <li><strong>React Router:</strong> Para o gerenciamento das rotas da aplicação.</li>
</ul>

<h2>Próximos Passos e Melhorias Futuras</h2>
<ul>
    <li>[ ] Migrar a persistência de dados do Local Storage para um backend real (ex: Firebase, Node.js + PostgreSQL).</li>
    <li>[ ] Implementar sistema de autenticação de usuários.</li>
    <li>[ ] Adicionar funcionalidade de "arrastar e soltar" (drag-and-drop) na edição manual da escala.</li>
    <li>[ ] Criar um dashboard com estatísticas e relatórios.</li>
</ul>
