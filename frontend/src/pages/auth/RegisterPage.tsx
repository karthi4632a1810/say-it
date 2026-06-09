import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, TextField, Typography, Alert, Link, CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@say-it/shared';
import type { z } from 'zod';
import { apiClient } from '../../services/api/client';
import { useAuth } from '../../hooks/useAuth';
import { PasswordField } from '../../components/common/PasswordField';

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [error, setError] = useState('');
  const [usernameValue, setUsernameValue] = useState('');
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  const { register, handleSubmit, watch, formState: { isSubmitting, errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const watchedUsername = watch('username');

  const checkAvailability = useCallback(async (username: string) => {
    const parsed = registerSchema.shape.username.safeParse(username);
    if (!parsed.success) {
      setAvailability('invalid');
      return;
    }
    setAvailability('checking');
    try {
      const { data } = await apiClient.get('/auth/check-username', { params: { username } });
      setAvailability(data.data.available ? 'available' : 'taken');
    } catch {
      setAvailability('idle');
    }
  }, []);

  useEffect(() => {
    if (!watchedUsername) {
      setAvailability('idle');
      return;
    }
    setUsernameValue(watchedUsername);
    const timer = setTimeout(() => checkAvailability(watchedUsername), 400);
    return () => clearTimeout(timer);
  }, [watchedUsername, checkAvailability]);

  const onSubmit = async (data: RegisterForm) => {
    setError('');
    if (availability !== 'available') {
      setError('Please choose an available username');
      return;
    }
    try {
      await registerUser(data.username, data.password);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg ?? 'Registration failed');
    }
  };

  const availabilityHint = () => {
    if (!usernameValue) return null;
    if (availability === 'checking') return <CircularProgress size={16} sx={{ ml: 1 }} />;
    if (availability === 'available') {
      return <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
        <CheckCircleIcon sx={{ fontSize: 14 }} /> Username is available
      </Typography>;
    }
    if (availability === 'taken') {
      return <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
        <CancelIcon sx={{ fontSize: 14 }} /> Username is already taken
      </Typography>;
    }
    if (availability === 'invalid') {
      return <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
        {errors.username?.message ?? 'Invalid username'}
      </Typography>;
    }
    return null;
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Card sx={{ width: 400 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>Create account</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Pick a unique username and password — that&apos;s it.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              label="Username"
              margin="normal"
              placeholder="e.g. karthi, 60464, karthi4632a"
              {...register('username')}
              error={availability === 'taken' || availability === 'invalid'}
            />
            {availabilityHint()}
            <PasswordField fullWidth label="Password" margin="normal" {...register('password')} />
            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={isSubmitting || availability !== 'available'}
              sx={{ mt: 2 }}
            >
              Register
            </Button>
          </form>
          <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login">Sign in</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
