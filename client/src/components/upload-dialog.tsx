import { useState } from "react";
import { useCreateCandidate } from "@/hooks/use-candidates";
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
import { Upload, Loader2, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function UploadDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const { mutate: createCandidate, isPending } = useCreateCandidate();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Auto-fill name if empty (remove extension)
      if (!name) {
        setName(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;

    const formData = new FormData();
    formData.append("resumeFile", file);
    formData.append("name", name);
    if (email) formData.append("email", email);
    if (githubUrl) formData.append("githubUrl", githubUrl);

    createCandidate(formData, {
      onSuccess: () => {
        setOpen(false);
        setFile(null);
        setName("");
        setEmail("");
        setGithubUrl("");
        toast({
          title: "Candidate added",
          description: "Resume uploaded and analysis started.",
        });
      },
      onError: (error) => {
        toast({
          title: "Upload failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
            <Upload className="size-4" />
            Upload Resume
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl border-border/60 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Candidate</DialogTitle>
          <DialogDescription>
            Upload a resume (PDF/DOCX) to start AI analysis.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="resume" className="text-xs font-semibold uppercase text-muted-foreground">Resume File</Label>
            {!file ? (
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="dropzone-file"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 border-muted-foreground/25 hover:border-primary/50 transition-all group"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground/70">PDF, DOCX (MAX. 5MB)</p>
                  </div>
                  <input id="dropzone-file" type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border rounded-xl bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <FileText className="size-4" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => setFile(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-xs font-semibold uppercase text-muted-foreground">Full Name</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="rounded-xl"
              placeholder="e.g. Jane Doe"
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-xs font-semibold uppercase text-muted-foreground">Email (Optional)</Label>
            <Input 
              id="email" 
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="rounded-xl"
              placeholder="e.g. jane@example.com"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="github" className="text-xs font-semibold uppercase text-muted-foreground">GitHub URL (Optional)</Label>
            <Input 
              id="github" 
              value={githubUrl} 
              onChange={(e) => setGithubUrl(e.target.value)} 
              className="rounded-xl"
              placeholder="https://github.com/username"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isPending || !file || !name} className="w-full rounded-xl font-semibold shadow-lg shadow-primary/20">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Upload & Analyze"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
