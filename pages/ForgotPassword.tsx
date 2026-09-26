import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your registered email address");
      return;
    }

    setIsLoading(true);
    try {
      // Simulate reset email request
      setTimeout(() => {
        setIsSubmitted(true);
        toast.success("Password reset instructions sent!");
        setIsLoading(false);
      }, 600);
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Account Security
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Ewu<span className="text-indigo-400">Swap</span>
          </h1>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-2xl text-slate-100">
          {!isSubmitted ? (
            <>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl font-bold text-white">Reset your password</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Enter your email address and we'll send you instructions to reset your password.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-slate-300 text-xs font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@university.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 transition-all mt-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Sending reset link...
                      </span>
                    ) : (
                      "Send Reset Instructions"
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-8 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Check your email</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  We sent a password reset link to <span className="text-indigo-300 font-semibold">{email}</span>.
                </p>
              </div>
              <p className="text-xs text-slate-500 pt-2">
                Didn't receive the email? Check your spam folder or{" "}
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="text-indigo-400 hover:underline font-medium"
                >
                  try again
                </button>.
              </p>
            </CardContent>
          )}

          <CardFooter className="flex justify-center border-t border-slate-800/60 pt-4">
            <Link href="/login" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
