
export const EMAIL_STYLES = {
  container: `
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #f4f7f6;
    margin: 0;
    padding: 40px 20px;
    color: #334155;
    line-height: 1.6;
  `,
  card: `
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border: 1px solid #e2e8f0;
  `,
  header: `
    background-color: #0f172a;
    padding: 32px;
    text-align: center;
    background-image: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  `,
  logo: `
    width: 140px;
    height: auto;
    display: block;
    margin: 0 auto;
  `,
  body: `
    padding: 40px 32px;
  `,
  h1: `
    color: #0f172a;
    font-size: 24px;
    font-weight: 700;
    margin-top: 0;
    margin-bottom: 24px;
    text-align: center;
  `,
  p: `
    font-size: 16px;
    color: #475569;
    margin-bottom: 20px;
  `,
  buttonContainer: `
    text-align: center;
    margin: 32px 0;
  `,
  button: `
    background-color: #2563eb;
    color: #ffffff;
    padding: 14px 32px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    font-size: 16px;
    display: inline-block;
    transition: background-color 0.2s;
    box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
  `,
  divider: `
    border-top: 1px solid #e2e8f0;
    margin: 32px 0;
  `,
  footer: `
    background-color: #f8fafc;
    padding: 24px 32px;
    text-align: center;
    font-size: 13px;
    color: #94a3b8;
    border-top: 1px solid #f1f5f9;
  `,
  socialIcon: `
    margin: 0 8px;
    text-decoration: none;
    color: #94a3b8;
    font-size: 20px;
  `
};

export const getBaseTemplate = (content, title) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="${EMAIL_STYLES.container}">
  <div style="${EMAIL_STYLES.card}">
    <div style="${EMAIL_STYLES.header}">
      <img src="https://compia.tech/COMPIA_BRAND_KIT/png/2x/compia-logo-mono-white.png" alt="Compia Enterprise" style="${EMAIL_STYLES.logo}">
    </div>
    
    <div style="${EMAIL_STYLES.body}">
      ${content}
    </div>

    <div style="${EMAIL_STYLES.footer}">
      <p style="margin: 0 0 12px 0;">© ${new Date().getFullYear()} Compia Enterprise. Todos os direitos reservados.</p>
      <p style="margin: 0;">Gestão Inteligente de Auditorias e Conformidade.</p>
      <div style="margin-top: 16px;">
        <a href="https://compia.tech" style="color: #2563eb; text-decoration: none; margin: 0 10px;">Website</a>
        <a href="https://compia.tech/privacy" style="color: #2563eb; text-decoration: none; margin: 0 10px;">Privacidade</a>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const getWelcomeTemplate = (name, loginUrl) => {
  const content = `
    <h1 style="${EMAIL_STYLES.h1}">Bem-vindo ao Compia! 🚀</h1>
    <p style="${EMAIL_STYLES.p}">Olá, <strong>${name}</strong>!</p>
    <p style="${EMAIL_STYLES.p}">Estamos muito felizes em ter você a bordo. Sua conta foi criada com sucesso e você já pode acessar a plataforma corporativa mais completa para gestão de auditorias.</p>
    <p style="${EMAIL_STYLES.p}">Comece agora mesmo a otimizar seus processos de conformidade.</p>
    
    <div style="${EMAIL_STYLES.buttonContainer}">
      <a href="${loginUrl}" style="${EMAIL_STYLES.button}">Acessar Plataforma</a>
    </div>
    
    <p style="${EMAIL_STYLES.p}" style="font-size: 14px; text-align: center; color: #94a3b8;">Ou copie este link: <a href="${loginUrl}" style="color: #2563eb;">${loginUrl}</a></p>
  `;
  return getBaseTemplate(content, "Bem-vindo ao Compia");
};

export const getApprovalTemplate = (name, loginUrl) => {
  const content = `
    <h1 style="${EMAIL_STYLES.h1}">Acesso Aprovado! ✅</h1>
    <p style="${EMAIL_STYLES.p}">Olá, <strong>${name}</strong>.</p>
    <p style="${EMAIL_STYLES.p}">Temos ótimas notícias! O administrador revisou seu cadastro e seu acesso ao <strong>Compia Enterprise</strong> foi aprovado.</p>
    <p style="${EMAIL_STYLES.p}">Você agora tem acesso total às funcionalidades atribuídas ao seu perfil.</p>
    
    <div style="${EMAIL_STYLES.buttonContainer}">
      <a href="${loginUrl}" style="${EMAIL_STYLES.button}">Entrar no Sistema</a>
    </div>
  `;
  return getBaseTemplate(content, "Seu acesso foi aprovado");
};

export const getAlertTemplate = (title, message, actionUrl, actionText) => {
  const content = `
    <h1 style="${EMAIL_STYLES.h1}">⚠️ ${title}</h1>
    <p style="${EMAIL_STYLES.p}">${message}</p>
    
    ${actionUrl ? `
    <div style="${EMAIL_STYLES.buttonContainer}">
      <a href="${actionUrl}" style="${EMAIL_STYLES.button}">${actionText || 'Ver Detalhes'}</a>
    </div>
    ` : ''}
  `;
  return getBaseTemplate(content, `Alerta: ${title}`);
};

export const getInvitationTemplate = (inviterName, organizationName, inviteUrl, role) => {
  const roleLabel = role === 'org_admin' ? 'Administrador' : 'Inspetor';
  const content = `
    <h1 style="${EMAIL_STYLES.h1}">Você foi convidado! 🎉</h1>
    <p style="${EMAIL_STYLES.p}"><strong>${inviterName}</strong> convidou você para fazer parte de <strong>${organizationName}</strong> no Compia Enterprise.</p>
    <p style="${EMAIL_STYLES.p}">Você será adicionado como <strong>${roleLabel}</strong> e terá acesso às funcionalidades de auditoria e conformidade.</p>
    
    <div style="${EMAIL_STYLES.buttonContainer}">
      <a href="${inviteUrl}" style="${EMAIL_STYLES.button}">Aceitar Convite</a>
    </div>
    
    <p style="${EMAIL_STYLES.p}" style="font-size: 14px; text-align: center; color: #94a3b8;">
      Este convite expira em <strong>7 dias</strong>. Se você não solicitou este convite, pode ignorar este email.
    </p>
  `;
  return getBaseTemplate(content, `Convite para ${organizationName}`);
};

export const getResetPasswordTemplate = (name, resetUrl) => {
  const content = `
    <h1 style="${EMAIL_STYLES.h1}">Redefinir Senha 🔐</h1>
    <p style="${EMAIL_STYLES.p}">Olá, <strong>${name}</strong>.</p>
    <p style="${EMAIL_STYLES.p}">Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha.</p>
    
    <div style="${EMAIL_STYLES.buttonContainer}">
      <a href="${resetUrl}" style="${EMAIL_STYLES.button}">Redefinir Senha</a>
    </div>
    
    <p style="${EMAIL_STYLES.p}" style="font-size: 14px; text-align: center; color: #94a3b8;">
      Este link expira em 1 hora. Se você não solicitou a redefinição, ignore este email.
    </p>
  `;
  return getBaseTemplate(content, "Redefinir Senha");
};

export const getAccessGrantedTemplate = (name, organizationName, loginUrl) => {
  const content = `
    <h1 style="${EMAIL_STYLES.h1}">Acesso Liberado! 🎉</h1>
    <p style="${EMAIL_STYLES.p}">Olá, <strong>${name}</strong>!</p>
    <p style="${EMAIL_STYLES.p}">Ótimas notícias! O pagamento da sua assinatura de <strong>${organizationName || 'Compia Enterprise'}</strong> foi confirmado.</p>
    <p style="${EMAIL_STYLES.p}">Seu acesso à plataforma está <strong>100% liberado</strong>. Você já pode começar a utilizar todas as funcionalidades do seu plano.</p>
    
    <div style="${EMAIL_STYLES.buttonContainer}">
      <a href="${loginUrl}" style="${EMAIL_STYLES.button}">Acessar Plataforma</a>
    </div>
    
    <p style="${EMAIL_STYLES.p}" style="font-size: 14px; text-align: center; color: #94a3b8;">
      Precisa de ajuda? Entre em contato com nosso suporte.
    </p>
  `;
  return getBaseTemplate(content, "Seu acesso foi liberado!");
};
