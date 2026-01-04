import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Phone, AlertTriangle } from 'lucide-react';
import { z } from 'zod';

const phoneSchema = z.string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number is too long')
  .regex(/^[\d\s\+\-\(\)]+$/, 'Please enter a valid phone number');

interface PhoneNumberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PhoneNumberModal({ open, onOpenChange }: PhoneNumberModalProps) {
  const { updatePhoneNumber, profile } = useAuth();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validatedPhone = phoneSchema.parse(phone.trim());
      
      const { error } = await updatePhoneNumber(validatedPhone);

      if (error) {
        throw error;
      }

      toast({
        title: 'Phone number updated!',
        description: 'Your phone number has been saved successfully.',
      });
      
      onOpenChange(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Invalid phone number',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass border-primary/20">
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Phone Number Required
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Hi {profile?.full_name}, we need your phone number to keep you updated. 
            Please add it to continue using the app.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-foreground/80 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 234 567 8900"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="bg-secondary/50 border-border/50 focus:border-primary h-12 text-center text-lg tracking-wide"
              autoFocus
            />
          </div>
          
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 glow-primary"
            disabled={isLoading || !phone.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Phone Number'
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            Your phone number will be kept private and secure.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
