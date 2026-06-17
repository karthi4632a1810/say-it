import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, TextField, Typography, Alert, Link } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@say-it/shared';
import type { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { PasswordField } from '../../components/common/PasswordField';

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: 'admin', password: 'Admin123!' },
  });

  const onSubmit = async (data: LoginForm) => {
    setError('');
    try {
      await login(data.username, data.password);
      navigate('/');
    } catch {
      setError('Invalid username or password');
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>Say IT</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Enterprise communication platform</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              label="Username"
              margin="normal"
              placeholder="e.g. admin, karthi, or 60464"
              error={!!errors.username}
              helperText={errors.username?.message}
              {...register('username')}
            />
            <PasswordField
              fullWidth
              label="Password"
              margin="normal"
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register('password')}
            />
            <Button fullWidth variant="contained" type="submit" disabled={isSubmitting} sx={{ mt: 2 }}>
              Sign in
            </Button>
          </form>
          <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
            New here?{' '}
            <Link component={RouterLink} to="/register">Create an account</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
