import { type Candidate } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { 
  MoreHorizontal, 
  Trash2, 
  Eye, 
  Github, 
  Briefcase, 
  GraduationCap,
  Code2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";

interface CandidateCardProps {
  candidate: Candidate;
  onDelete: (id: number) => void;
}

export function CandidateCard({ candidate, onDelete }: CandidateCardProps) {
  const getScoreColor = (score: number | null) => {
    if (!score) return "bg-gray-100 text-gray-600";
    if (score >= 80) return "bg-green-100 text-green-700 border-green-200";
    if (score >= 60) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  return (
    <Card className="hover-card-effect overflow-hidden border-border/50 group">
      <CardHeader className="flex flex-row items-start justify-between p-5 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-lg leading-none">{candidate.name}</h3>
            {candidate.score && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getScoreColor(candidate.score)}`}>
                {candidate.score}% Match
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-medium">{candidate.email || "No email provided"}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link href={`/candidates/${candidate.id}`}>
              <DropdownMenuItem className="cursor-pointer">
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => onDelete(candidate.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent className="p-5 pt-4 space-y-4">
        {/* Skills Tags */}
        <div className="flex flex-wrap gap-1.5">
          {candidate.skills?.slice(0, 4).map((skill, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] font-medium px-2 py-0.5 bg-secondary/50 hover:bg-secondary">
              {skill}
            </Badge>
          ))}
          {(candidate.skills?.length || 0) > 4 && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground px-2 py-0.5">
              +{(candidate.skills?.length || 0) - 4} more
            </Badge>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Briefcase className="size-3.5" />
            <span>{(candidate.experience?.length || 0)} Roles</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GraduationCap className="size-3.5" />
            <span>{(candidate.education?.length || 0)} Education</span>
          </div>
          {candidate.githubUrl && (
            <div className="flex items-center gap-1.5 col-span-2 text-primary">
              <Github className="size-3.5" />
              <a href={candidate.githubUrl} target="_blank" rel="noopener" className="hover:underline truncate max-w-[150px]">
                GitHub Profile
              </a>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-3 bg-muted/20 border-t border-border/40 flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground font-medium">
          Added {format(new Date(candidate.createdAt || new Date()), 'MMM d, yyyy')}
        </span>
        <Link href={`/candidates/${candidate.id}`}>
          <Button size="sm" variant="ghost" className="h-7 text-xs hover:text-primary hover:bg-primary/10">
            Analyze
            <Code2 className="ml-1.5 size-3" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
