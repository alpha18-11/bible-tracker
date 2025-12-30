import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import bethesdaLogo from '@/assets/bethesda-logo.png';

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Sign Up form state
  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  
  // Sign In form state
  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    if (user && !authLoading) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = signUpSchema.parse(signUpData);
      
      const { error } = await signUp(
        validated.email,
        validated.password,
        validated.fullName,
        validated.phone
      );

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: 'Account exists',
            description: 'This email is already registered. Please sign in instead.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: 'Registration successful!',
        description: 'Please wait for admin approval to access the Bible tracker.',
      });
      
      navigate('/');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: (error as Error).message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = signInSchema.parse(signInData);
      
      const { error } = await signIn(validated.email, validated.password);

      if (error) {
        toast({
          title: 'Sign in failed',
          description: 'Invalid email or password',
          variant: 'destructive',
        });
        return;
      }

      navigate('/');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: (error as Error).message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background orbs */}
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />
      <div className="gradient-orb gradient-orb-3" />
      
      <div className="w-full max-w-sm relative z-10">
        {/* Floating Header */}
        <div className="text-center mb-10">
          <div className="inline-block mb-6 animate-float">
            <img 
              src={bethesdaLogo} 
              alt="Bethesda Church Logo" 
              className="w-24 h-24 object-contain"
            />
          </div>
          <h1 className="text-3xl font-light tracking-tight text-white mb-2">
            Bethesda <span className="italic font-normal bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">Bible Tracker</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Join the 365-day Bible reading journey
          </p>
        </div>
        
        {/* Floating Form */}
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/5 backdrop-blur-sm border border-white/10">
            <TabsTrigger value="signin" className="data-[state=active]:bg-[#0066FF] data-[state=active]:text-white">
              Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="data-[state=active]:bg-[#0066FF] data-[state=active]:text-white">
              Sign Up
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-foreground/80">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="your@email.com"
                  value={signInData.email}
                  onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                  required
                  className="bg-white/5 backdrop-blur-sm border-white/10 focus:border-[#0066FF] h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-foreground/80">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
                  value={signInData.password}
                  onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                  required
                  className="bg-white/5 backdrop-blur-sm border-white/10 focus:border-[#0066FF] h-12"
                />
              </div>
              
              <Button
                type="submit"
                className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold h-12 mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Sign In
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-foreground/80">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  value={signUpData.fullName}
                  onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                  required
                  className="bg-white/5 backdrop-blur-sm border-white/10 focus:border-[#0066FF] h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-foreground/80">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={signUpData.email}
                  onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                  required
                  className="bg-white/5 backdrop-blur-sm border-white/10 focus:border-[#0066FF] h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-phone" className="text-foreground/80">Phone (optional)</Label>
                <Input
                  id="signup-phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={signUpData.phone}
                  onChange={(e) => setSignUpData({ ...signUpData, phone: e.target.value })}
                  className="bg-white/5 backdrop-blur-sm border-white/10 focus:border-[#0066FF] h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-foreground/80">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={signUpData.password}
                  onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                  required
                  className="bg-white/5 backdrop-blur-sm border-white/10 focus:border-[#0066FF] h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-confirm" className="text-foreground/80">Confirm Password</Label>
                <Input
                  id="signup-confirm"
                  type="password"
                  placeholder="••••••••"
                  value={signUpData.confirmPassword}
                  onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                  required
                  className="bg-white/5 backdrop-blur-sm border-white/10 focus:border-[#0066FF] h-12"
                />
              </div>
              
              <Button
                type="submit"
                className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold h-12 mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Create Account
              </Button>
              
              <p className="text-xs text-muted-foreground text-center pt-2">
                After registration, an admin will approve your account.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
