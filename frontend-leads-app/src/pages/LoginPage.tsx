import { useRef, useState, type FormEvent } from 'react';
import { toApiError, type ApiError } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Field } from '../components/Field';
import { BrandMark } from '../components/Layout';
import { ErrorMessage } from '../components/Feedback';
import { Tooltip } from '../components/Tooltip';
import { toast } from '../toast';
import { validateLogin, type LoginField } from '../validation';

// Credenciales de demo creadas por `npm run seed` en el backend (publicadas en su README)
const DEMO_USERS = [
  { nombre: 'Agente 01 (administrador)', telefono: '600000001', password: 'Admin-2026' },
  { nombre: 'Agente 02', telefono: '600000002', password: 'Agente2-2026' },
  { nombre: 'Agente 03', telefono: '600000003', password: 'Agente3-2026' },
];

export function LoginPage() {
  const { login } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  const errors = validateLogin({ telefono, password });
  // Los errores aparecen al intentar enviar; no al salir del campo, para no mover el botón antes del clic
  const shown = (field: LoginField) => (submitted ? errors[field] : undefined);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setError(null);

    const firstInvalid = (Object.keys(errors) as LoginField[])[0];
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    setLoading(true);
    try {
      await login(telefono.trim(), password);
      toast.success('Sesión iniciada');
    } catch (caught) {
      setError(toApiError(caught));
      setLoading(false);
    }
  }

  return (
    <main className="login">
      <div className="login-brand">
        <BrandMark />
        <h1>CRM · Leads comerciales</h1>
        <p>Gana Energía · accede con tu cuenta de agente</p>
      </div>
      <form ref={formRef} className="card form" onSubmit={handleSubmit} noValidate>
        <h2>Iniciar sesión</h2>
        <Field
          label="Teléfono"
          tip="El teléfono con el que está registrado tu agente"
          name="telefono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          error={shown('telefono')}
          inputMode="tel"
          autoComplete="username"
          autoFocus
        />
        <Field
          label="Contraseña"
          tip="La contraseña de tu agente. Si la has olvidado, pídesela a un administrador."
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={shown('password')}
          autoComplete="current-password"
        />
        {error && <ErrorMessage error={error} />}
        <button className="btn btn-primary" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <section className="card">
        <h2>Usuarios de demo</h2>
        <ul className="demo-users">
          {DEMO_USERS.map((user) => (
            <li key={user.telefono}>
              <span>
                {user.nombre}
                <small className="muted"> · {user.telefono}</small>
              </span>
              <Tooltip text="Rellena el formulario con las credenciales de este usuario de demo" align="end">
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => {
                    setTelefono(user.telefono);
                    setPassword(user.password);
                  }}
                >
                  Usar
                </button>
              </Tooltip>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
