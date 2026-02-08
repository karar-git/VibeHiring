import { Layout } from "@/components/layout";
import { useSubscription, useUpdateSubscription } from "@/hooks/use-subscription";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function SubscriptionPage() {
  const { data: subscription, isLoading } = useSubscription();
  const { mutate: updatePlan, isPending } = useUpdateSubscription();
  const { toast } = useToast();

  const handleUpgrade = (plan: 'free' | 'pro' | 'enterprise') => {
    updatePlan(plan, {
      onSuccess: () => {
        toast({
          title: "Plan updated!",
          description: `You are now on the ${plan} plan.`,
        });
      },
      onError: (err) => {
        toast({
          title: "Update failed",
          description: err.message,
          variant: "destructive",
        });
      }
    });
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      description: 'Perfect for trying out RecruitAI.',
      features: ['5 Resume Analyses per month', 'Basic Skills Extraction', 'Standard Support'],
      limit: '5 CVs/mo'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$29',
      description: 'For growing teams and serious hiring.',
      features: ['50 Resume Analyses per month', 'GitHub Vibe Coding Score', 'Detailed AI Summary', 'Priority Support'],
      popular: true,
      limit: '50 CVs/mo'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$99',
      description: 'Maximum power for large organizations.',
      features: ['Unlimited Analyses', 'Custom AI Models', 'API Access', 'Dedicated Account Manager'],
      limit: 'Unlimited'
    }
  ];

  return (
    <Layout>
      <div className="space-y-8 text-center max-w-5xl mx-auto">
        <div>
          <h1 className="text-4xl font-display font-bold">Simple, Transparent Pricing</h1>
          <p className="text-muted-foreground mt-4 text-lg">
            Choose the plan that best fits your hiring needs. Upgrade or downgrade anytime.
          </p>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 mt-10">
            {plans.map((plan) => {
              const isCurrent = subscription?.plan === plan.id;
              
              return (
                <Card 
                  key={plan.id} 
                  className={cn(
                    "relative flex flex-col border-border/60 transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                    plan.popular ? "border-primary shadow-lg shadow-primary/5 scale-105 z-10" : "bg-card"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold shadow-md">
                      MOST POPULAR
                    </div>
                  )}
                  
                  <CardHeader>
                    <CardTitle className="font-display text-2xl">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="flex-1">
                    <ul className="space-y-3 text-left text-sm">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-green-500 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      className={cn("w-full rounded-xl", isCurrent ? "bg-muted text-muted-foreground hover:bg-muted cursor-default" : "shadow-lg shadow-primary/20")} 
                      variant={isCurrent ? "ghost" : (plan.popular ? "default" : "outline")}
                      disabled={isCurrent || isPending}
                      onClick={() => handleUpgrade(plan.id as any)}
                    >
                      {isCurrent ? "Current Plan" : isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upgrade"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
