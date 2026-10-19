import RegisterForm from '../components/RegisterForm';

export default function Register() {
  return (
    <main className="page-shell">
      <a className="skip-link" href="#register-form">
        Skip to registration form
      </a>
      <div className="register-layout">
        <aside className="welcome-panel" aria-label="About HOPE System">
          <a className="brand" href="/" aria-label="HOPE System home">
            <span className="brand-mark" aria-hidden="true">
              H
            </span>
            <span className="brand-name">
              HOPE <span>System</span>
            </span>
          </a>
          <div className="welcome-copy">
            <p className="eyebrow">A BETTER WAY TO WORK</p>
            <h2>One workspace.<br />A hopeful future.</h2>
            <p>
              Request an account to access the tools and resources your team
              needs.
            </p>
          </div>
          <p className="panel-footnote">Human-centered Operations Platform</p>
        </aside>

        <section className="form-panel" aria-labelledby="page-title">
          <div className="form-panel-inner">
            <p className="eyebrow mobile-eyebrow">HOPE SYSTEM</p>
            <h1 id="page-title">Create your account</h1>
            <p className="intro">
              Enter your details to request access. Confirm your email and wait
              for account approval before using protected services.
            </p>
            <RegisterForm />
            {import.meta.env.VITE_SIGN_IN_URL && (
              <p className="fine-print">
                Already have an account?{' '}
                <a href={import.meta.env.VITE_SIGN_IN_URL}>Sign in</a>
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
