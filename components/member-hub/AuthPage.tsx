import Link from 'next/link';
import { hubConfig } from '@/lib/member-hub/config';
import HubForm from './HubForm';
import { signIn, signInAdmin, register, recoverPassword, resetPassword, resendConfirmation } from '@/lib/member-hub/actions';

const configurations = {
  adminLogin: { title: 'Admin Sign In', button: 'Sign In', action: signInAdmin,
    fields: [{ name: 'email', label: 'Email', type: 'email', autoComplete: 'email' }, { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' }] },
  login: { title: 'Member Sign In', button: 'Sign In', action: signIn,
    fields: [{ name: 'email', label: 'Email', type: 'email', autoComplete: 'email' }, { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' }] },
  register: { title: 'Resident Registration', button: 'Create Account', action: register,
    fields: [{ name: 'full_name', label: 'Full Name', autoComplete: 'name', maxLength: 200 }, { name: 'address', label: 'Cypressdale Address', autoComplete: 'street-address', maxLength: 500 },
      { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' }, { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', minLength: 12 }] },
  forgot: { title: 'Reset Your Password', button: 'Send Reset Link', action: recoverPassword,
    fields: [{ name: 'email', label: 'Email', type: 'email', autoComplete: 'email' }] },
  resend: { title: 'Confirm Your Email', button: 'Resend Confirmation', action: resendConfirmation,
    fields: [{ name: 'email', label: 'Email', type: 'email', autoComplete: 'email' }] },
  reset: { title: 'Choose a New Password', button: 'Save Password', action: resetPassword,
    fields: [{ name: 'password', label: 'New Password', type: 'password', autoComplete: 'new-password', minLength: 12 }, { name: 'confirm_password', label: 'Confirm Password', type: 'password', autoComplete: 'new-password', minLength: 12 }] },
};

export default function AuthPage({ mode, message }: { mode: keyof typeof configurations; message?: string }) {
  const config = configurations[mode];
  let available = true;
  try { hubConfig(); } catch { available = false; }
  return <div className="hub-auth">
    <img src="/images/entrance.jpg" alt="Cypressdale neighborhood entrance" className="hub-auth-image" />
    <h1>{config.title}</h1>
    {mode === 'register' && <p className="hub-subtitle">Member access requires email confirmation and admin approval.</p>}
    {(mode === 'register' || mode === 'reset') && <p className="hub-subtitle">Use a password with at least 12 characters.</p>}
    {!available && <p className="hub-message" role="status">Member access is not available yet.</p>}
    {message && <p className="hub-message" role="status">{message}</p>}
    <HubForm action={config.action} fields={config.fields} button={config.button} disabled={!available} />
    <div className="hub-auth-links">
      {mode === 'adminLogin' ? <><Link href="/forgot-password">Forgot Password?</Link><Link href="/resend-confirmation">Resend Confirmation</Link></>
        : mode === 'login' ? <><Link href="/register">Register as a Resident</Link><Link href="/forgot-password">Forgot Password?</Link><Link href="/resend-confirmation">Resend Confirmation</Link></>
        : <Link href="/login">Back to Sign In</Link>}
    </div>
  </div>;
}
