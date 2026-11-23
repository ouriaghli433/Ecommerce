import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/app/providers/ToastProvider';
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@/components/ui';
import { applyLaravelFieldErrors } from '@/services/http/errorParser';
import { useCartStore } from '@/store/cartStore';
import { registerSchema, type RegisterFormValues } from './schemas';
import { useRegister } from './useAuth';

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const registerMutation = useRegister();
  const guestToken = useCartStore((s) => s.guestToken);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      password_confirmation: '',
    },
  });

  const from = (location.state as { from?: string } | null)?.from;

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      const response = await registerMutation.mutateAsync(values);
      toast.success('Account created', `Welcome, ${response.customer.first_name}!`);
      if (from && from.startsWith('/')) {
        navigate(from, { replace: true });
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
        <CardTitle className="text-2xl font-bold">Create customer account</CardTitle>
        <CardDescription>
          Register to save shipping addresses, track orders, and check out seamlessly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {guestToken && (
          <Alert variant="info">
            Items currently in your guest cart will be transferred to your new account automatically.
          </Alert>
        )}

        {serverError && (
          <Alert variant="error" title="Registration failed">
            {serverError}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              autoComplete="given-name"
              placeholder="Yasmine"
              error={errors.first_name?.message}
              {...register('first_name')}
            />
            <Input
              label="Last name"
              autoComplete="family-name"
              placeholder="El Amrani"
              error={errors.last_name?.message}
              {...register('last_name')}
            />
          </div>

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
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
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

          <Input
            label="Confirm password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat password"
            error={errors.password_confirmation?.message}
            {...register('password_confirmation')}
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={registerMutation.isPending}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" state={location.state} className="font-semibold text-emerald-700 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
