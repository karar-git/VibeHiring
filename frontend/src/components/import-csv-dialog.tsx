import { useState } from "react";
import { useImportCsv, type CsvImportResult } from "@/hooks/use-candidates";
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
import { FileSpreadsheet, Loader2, X, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportCsvDialogProps {
  jobId: number;
  trigger?: React.ReactNode;
}

const CSV_TEMPLATE = `name,email,cv_text,github_url
Jane Doe,jane@example.com,"Experienced full-stack developer with 5 years in React, Node.js, and PostgreSQL. Led a team of 4 engineers at Acme Corp. BS in Computer Science from MIT.",https://github.com/janedoe
John Smith,john@example.com,"Backend engineer specializing in Python, Django, and AWS. 3 years experience building REST APIs and microservices. MS in Software Engineering.",`;

export function ImportCsvDialog({ jobId, trigger }: ImportCsvDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const { mutate: importCsv, isPending } = useImportCsv(jobId);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    importCsv(file, {
      onSuccess: (data) => {
        setResult(data);
        if (data.imported > 0 && data.failed === 0) {
          toast({
            title: "Import complete",
            description: `${data.imported} candidate${data.imported !== 1 ? "s" : ""} imported and analyzed.`,
          });
        } else if (data.imported > 0) {
          toast({
            title: "Import partially complete",
            description: `${data.imported} imported, ${data.failed} failed.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Import failed",
            description: `No candidates were imported. ${data.errors[0] || ""}`,
            variant: "destructive",
          });
        }
      },
      onError: (error) => {
        toast({
          title: "Import failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "candidates_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isPending) {
      setOpen(isOpen);
      if (!isOpen) {
        setFile(null);
        setResult(null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <FileSpreadsheet className="size-4" />
            Import CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-2xl border-border/60 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Bulk Import Candidates</DialogTitle>
          <DialogDescription>
            Upload a CSV file with candidate data. Each row will be analyzed by AI against the job description.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* CSV Format Info */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Expected CSV Columns</p>
            <div className="text-sm space-y-1">
              <p><span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">cv_text</span> <span className="text-muted-foreground">(required)</span></p>
              <p><span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">name</span> <span className="text-muted-foreground">(optional)</span></p>
              <p><span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">email</span> <span className="text-muted-foreground">(optional)</span></p>
              <p><span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">github_url</span> <span className="text-muted-foreground">(optional)</span></p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs mt-1 h-7 px-2"
              onClick={downloadTemplate}
            >
              <Download className="size-3" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          {!file ? (
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="csv-dropzone"
                className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 border-muted-foreground/25 hover:border-primary/50 transition-all group"
              >
                <div className="flex flex-col items-center justify-center py-4">
                  <FileSpreadsheet className="w-7 h-7 mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Click to upload</span> a .csv file
                  </p>
                </div>
                <input
                  id="csv-dropzone"
                  type="file"
                  className="hidden"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 border rounded-xl bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <FileSpreadsheet className="size-4" />
                </div>
                <div className="text-sm">
                  <p className="font-medium truncate max-w-[280px]">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              {!isPending && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => { setFile(null); setResult(null); }}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="rounded-xl border border-border/60 p-4 space-y-2">
              <div className="flex items-center gap-4">
                {result.imported > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-green-600">
                    <CheckCircle2 className="size-4" />
                    <span>{result.imported} imported</span>
                  </div>
                )}
                {result.failed > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-red-600">
                    <AlertTriangle className="size-4" />
                    <span>{result.failed} failed</span>
                  </div>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-0.5 max-h-24 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-2">
            {result && result.imported > 0 ? (
              <Button
                type="button"
                className="w-full rounded-xl font-semibold"
                onClick={() => handleClose(false)}
              >
                Done
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isPending || !file}
                className="w-full rounded-xl font-semibold shadow-lg shadow-primary/20"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing & Analyzing...
                  </>
                ) : (
                  "Import & Analyze"
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
