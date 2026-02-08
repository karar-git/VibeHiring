import { useState } from "react";
import { Layout } from "@/components/layout";
import { useCandidates, useDeleteCandidate } from "@/hooks/use-candidates";
import { UploadDialog } from "@/components/upload-dialog";
import { CandidateCard } from "@/components/candidate-card";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CandidatesPage() {
  const { data: candidates, isLoading } = useCandidates();
  const { mutate: deleteCandidate } = useDeleteCandidate();
  const [search, setSearch] = useState("");

  const filteredCandidates = candidates?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Candidates</h1>
            <p className="text-muted-foreground mt-1">Manage and analyze your talent pool.</p>
          </div>
          <UploadDialog />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9 rounded-xl border-border/60 bg-muted/20 focus:bg-background transition-all" 
            placeholder="Search by name or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            <AnimatePresence>
              {filteredCandidates?.map((candidate) => (
                <motion.div
                  key={candidate.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <CandidateCard 
                    candidate={candidate} 
                    onDelete={deleteCandidate} 
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        
        {!isLoading && filteredCandidates?.length === 0 && (
          <div className="text-center py-20 bg-muted/10 rounded-2xl border border-dashed border-border">
            <h3 className="text-lg font-medium text-muted-foreground">No candidates found</h3>
            <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your search or upload a new resume.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
