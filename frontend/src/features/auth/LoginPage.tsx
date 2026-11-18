import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/app/providers/ToastProvider';
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@/components/ui';
import { applyLaravelFieldErrors } from '@/services/http/errorParser';
import { useCartStore } from '@/store/cartStore';
import { loginSchema, type LoginFormValues } from './schemas';
import { useLogin } from './useAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const loginMutation = useLogin();
  const guestToken = useCartStore((s) => s.guestToken);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const from = (location.state as { from?: string } | null)?.from;

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const response = await loginMutation.mutateAsync(values);
      toast.success('Welcome back', `Signed in as ${response.user.first_name}`);
      if (from && from.startsWith('/')) {
        navigate(from, { replace: true });
      } else if (response.user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (error) {
      const parsed = applyLaravelFieldErrors(error, setError);
      setServerError(parsed.message);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Sign in to your account</CardTitle>
        <CardDescription>
          Enter your email and password to access orders, addresses, and checkout.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {guestToken && (
          <Alert variant="info">
            Your current guest shopping bag will be merged into your account on sign in.
          </Alert>
        )}

        {serverError && (
          <Alert variant="error" title="Sign in failed">
            {serverError}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...register('password')}
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={loginMutation.isPending}
            leftIcon={<LogIn className="h-4 w-4" />}
          >
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-slate-600">
          Don&apos;t have an account?{' '}
          <Link to="/register" state={location.state} className="font-semibold text-emerald-700 hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
