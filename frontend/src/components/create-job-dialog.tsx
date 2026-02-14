import { useState } from "react";
import { useCreateJob } from "@/hooks/use-jobs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function CreateJobDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const { mutate: createJob, isPending } = useCreateJob();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    createJob(
      { title, description, company: company || undefined },
      {
        onSuccess: () => {
          setOpen(false);
          setTitle("");
          setCompany("");
          setDescription("");
          toast({
            title: "Job created",
            description: "Your job offer has been created. Start uploading CVs!",
          });
        },
        onError: (error) => {
          toast({
            title: "Failed to create job",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
            <Plus className="size-4" />
            New Job Offer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-2xl border-border/60 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create Job Offer</DialogTitle>
          <DialogDescription>
            Define a job position. Uploaded CVs will be analyzed against this description.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-xs font-semibold uppercase text-muted-foreground">
              Job Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl"
              placeholder="e.g. Senior Frontend Developer"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="company" className="text-xs font-semibold uppercase text-muted-foreground">
              Company Name
            </Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="rounded-xl"
              placeholder="e.g. Acme Inc."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description" className="text-xs font-semibold uppercase text-muted-foreground">
              Job Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl min-h-[140px] resize-none"
              placeholder="Describe the role, required skills, experience level, responsibilities..."
              required
            />
            <p className="text-[10px] text-muted-foreground">
              The AI will use this description to evaluate and rank candidates.
            </p>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="submit"
              disabled={isPending || !title || !description}
              className="w-full rounded-xl font-semibold shadow-lg shadow-primary/20"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Job Offer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
