import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Search, AlertTriangle, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Keyword {
  id: string;
  keyword: string;
  category: string;
  action: string;
  is_regex: boolean;
  created_at: string;
}

interface ImportKeyword {
  keyword: string;
  category: string;
  action: string;
  is_regex?: boolean;
}

const CATEGORIES = [
  { value: "hate_speech", label: "Hate Speech" },
  { value: "harassment", label: "Harassment" },
  { value: "spam", label: "Spam" },
  { value: "violence", label: "Violence" },
  { value: "adult_content", label: "Adult Content" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
];

const ACTIONS = [
  { value: "flag", label: "Flag for Review" },
  { value: "block", label: "Block Immediately" },
];

const VALID_CATEGORIES = CATEGORIES.map(c => c.value);
const VALID_ACTIONS = ACTIONS.map(a => a.value);

export function KeywordManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // New keyword form state
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState("spam");
  const [newAction, setNewAction] = useState("flag");
  const [isRegex, setIsRegex] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("moderation_keywords")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setKeywords(data);
    }
    setLoading(false);
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.trim() || !user) return;

    // Validate regex if enabled
    if (isRegex) {
      try {
        new RegExp(newKeyword);
      } catch {
        toast({
          title: "Invalid regex pattern",
          description: "Please enter a valid regular expression",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    const { error } = await supabase.from("moderation_keywords").insert([{
      keyword: newKeyword.trim(),
      category: newCategory,
      action: newAction,
      is_regex: isRegex,
      created_by: user.id,
    }] as any);

    if (error) {
      toast({
        title: "Error adding keyword",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Keyword added successfully" });
      setNewKeyword("");
      setNewCategory("spam");
      setNewAction("flag");
      setIsRegex(false);
      setDialogOpen(false);
      fetchKeywords();
    }
    setSaving(false);
  };

  const handleDeleteKeyword = async (id: string) => {
    const { error } = await supabase
      .from("moderation_keywords")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error deleting keyword",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Keyword removed" });
      setKeywords(keywords.filter(k => k.id !== id));
    }
  };

  const handleExport = () => {
    const exportData = keywords.map(({ keyword, category, action, is_regex }) => ({
      keyword,
      category,
      action,
      is_regex,
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keywords-blocklist-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({ title: `Exported ${keywords.length} keywords` });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setImporting(true);
    try {
      const text = await file.text();
      let importData: ImportKeyword[];

      // Try JSON first
      try {
        importData = JSON.parse(text);
      } catch {
        // Try CSV format: keyword,category,action,is_regex
        const lines = text.split("\n").filter(line => line.trim());
        const hasHeader = lines[0]?.toLowerCase().includes("keyword");
        const dataLines = hasHeader ? lines.slice(1) : lines;
        
        importData = dataLines.map(line => {
          const [keyword, category = "spam", action = "flag", is_regex = "false"] = line.split(",").map(s => s.trim());
          return {
            keyword,
            category: VALID_CATEGORIES.includes(category) ? category : "spam",
            action: VALID_ACTIONS.includes(action) ? action : "flag",
            is_regex: is_regex === "true",
          };
        }).filter(k => k.keyword);
      }

      if (!Array.isArray(importData) || importData.length === 0) {
        throw new Error("Invalid file format");
      }

      // Validate and normalize data
      const validKeywords = importData.filter(k => 
        typeof k.keyword === "string" && k.keyword.trim()
      ).map(k => ({
        keyword: k.keyword.trim(),
        category: VALID_CATEGORIES.includes(k.category) ? k.category : "spam",
        action: VALID_ACTIONS.includes(k.action) ? k.action : "flag",
        is_regex: Boolean(k.is_regex),
        created_by: user.id,
      }));

      if (validKeywords.length === 0) {
        throw new Error("No valid keywords found in file");
      }

      // Check for duplicates with existing keywords
      const existingSet = new Set(keywords.map(k => k.keyword.toLowerCase()));
      const newKeywords = validKeywords.filter(k => !existingSet.has(k.keyword.toLowerCase()));

      if (newKeywords.length === 0) {
        toast({
          title: "No new keywords",
          description: "All keywords in the file already exist",
        });
        return;
      }

      const { error } = await supabase
        .from("moderation_keywords")
        .insert(newKeywords as any);

      if (error) throw error;

      toast({
        title: "Import successful",
        description: `Added ${newKeywords.length} new keywords (${validKeywords.length - newKeywords.length} duplicates skipped)`,
      });
      fetchKeywords();
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message || "Invalid file format. Use JSON or CSV.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const filteredKeywords = keywords.filter(k =>
    k.keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "hate_speech": return "bg-red-500/20 text-red-400";
      case "harassment": return "bg-orange-500/20 text-orange-400";
      case "spam": return "bg-yellow-500/20 text-yellow-400";
      case "violence": return "bg-red-600/20 text-red-500";
      case "adult_content": return "bg-pink-500/20 text-pink-400";
      case "misinformation": return "bg-purple-500/20 text-purple-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getActionColor = (action: string) => {
    return action === "block" 
      ? "bg-destructive/20 text-destructive" 
      : "bg-secondary text-secondary-foreground";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Keyword Blocklist
              </CardTitle>
              <CardDescription>
                Manage words and patterns that trigger automatic moderation
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                accept=".json,.csv,.txt"
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                <Upload className="w-4 h-4 mr-2" />
                {importing ? "Importing..." : "Import"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={keywords.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Blocked Keyword</DialogTitle>
                  <DialogDescription>
                    Add a word or pattern that will trigger automatic moderation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyword">Keyword or Pattern</Label>
                    <Input
                      id="keyword"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder={isRegex ? "\\b(bad|word)\\b" : "blocked word"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="action">Action</Label>
                    <Select value={newAction} onValueChange={setNewAction}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIONS.map(act => (
                          <SelectItem key={act.value} value={act.value}>
                            {act.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="regex">Use Regular Expression</Label>
                      <p className="text-xs text-muted-foreground">
                        Enable pattern matching for complex rules
                      </p>
                    </div>
                    <Switch
                      id="regex"
                      checked={isRegex}
                      onCheckedChange={setIsRegex}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddKeyword} disabled={saving || !newKeyword.trim()}>
                    {saving ? "Adding..." : "Add Keyword"}
                  </Button>
                </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Import/Export formats: JSON array or CSV (keyword,category,action,is_regex)
          </p>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keywords..."
              className="pl-9"
            />
          </div>

          {filteredKeywords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No matching keywords found" : "No keywords configured yet"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredKeywords.map((keyword) => (
                <div
                  key={keyword.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <code className="px-2 py-1 bg-muted rounded text-sm font-mono truncate max-w-[200px]">
                      {keyword.keyword}
                    </code>
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(keyword.category)}>
                        {keyword.category.replace("_", " ")}
                      </Badge>
                      <Badge className={getActionColor(keyword.action)}>
                        {keyword.action}
                      </Badge>
                      {keyword.is_regex && (
                        <Badge variant="outline" className="text-xs">
                          regex
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteKeyword(keyword.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
