import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, BarChart3, Play, Pause, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Ad, AdSettings } from "@/types/ad";

type AdStatus = "draft" | "active" | "paused" | "scheduled" | "ended";

interface AdFormData {
  title: string;
  description: string;
  video_url: string;
  image_url: string;
  click_url: string;
  advertiser_name: string;
  advertiser_logo_url: string;
  status: AdStatus;
  start_date: string;
  end_date: string;
  priority: number;
}

const defaultFormData: AdFormData = {
  title: "",
  description: "",
  video_url: "",
  image_url: "",
  click_url: "",
  advertiser_name: "",
  advertiser_logo_url: "",
  status: "draft",
  start_date: "",
  end_date: "",
  priority: 1,
};

export function AdsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ads, setAds] = useState<Ad[]>([]);
  const [settings, setSettings] = useState<AdSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [formData, setFormData] = useState<AdFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [adsRes, settingsRes] = await Promise.all([
      supabase.from("ads").select("*").order("priority", { ascending: false }),
      supabase.from("ad_settings").select("*").limit(1).single(),
    ]);

    if (adsRes.data) setAds(adsRes.data as Ad[]);
    if (settingsRes.data) setSettings(settingsRes.data as AdSettings);
    
    setLoading(false);
  };

  const handleOpenDialog = (ad?: Ad) => {
    if (ad) {
      setEditingAd(ad);
      setFormData({
        title: ad.title,
        description: ad.description || "",
        video_url: ad.video_url || "",
        image_url: ad.image_url || "",
        click_url: ad.click_url,
        advertiser_name: ad.advertiser_name,
        advertiser_logo_url: ad.advertiser_logo_url || "",
        status: ad.status as AdStatus,
        start_date: ad.start_date ? ad.start_date.split("T")[0] : "",
        end_date: ad.end_date ? ad.end_date.split("T")[0] : "",
        priority: ad.priority,
      });
    } else {
      setEditingAd(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleSaveAd = async () => {
    if (!formData.title || !formData.click_url || !formData.advertiser_name) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    if (!formData.video_url && !formData.image_url) {
      toast({ title: "Please provide a video URL or image URL", variant: "destructive" });
      return;
    }

    setSaving(true);

    const adData = {
      title: formData.title,
      description: formData.description || null,
      video_url: formData.video_url || null,
      image_url: formData.image_url || null,
      click_url: formData.click_url,
      advertiser_name: formData.advertiser_name,
      advertiser_logo_url: formData.advertiser_logo_url || null,
      status: formData.status,
      start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
      end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      priority: formData.priority,
      created_by: user?.id,
    };

    if (editingAd) {
      const { error } = await supabase
        .from("ads")
        .update(adData)
        .eq("id", editingAd.id);

      if (error) {
        toast({ title: "Failed to update ad", variant: "destructive" });
      } else {
        toast({ title: "Ad updated successfully" });
        setDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from("ads").insert(adData);

      if (error) {
        toast({ title: "Failed to create ad", variant: "destructive" });
      } else {
        toast({ title: "Ad created successfully" });
        setDialogOpen(false);
        fetchData();
      }
    }

    setSaving(false);
  };

  const handleDeleteAd = async (adId: string) => {
    const { error } = await supabase.from("ads").delete().eq("id", adId);

    if (error) {
      toast({ title: "Failed to delete ad", variant: "destructive" });
    } else {
      toast({ title: "Ad deleted" });
      fetchData();
    }
  };

  const handleToggleStatus = async (ad: Ad) => {
    const newStatus = ad.status === "active" ? "paused" : "active";
    const { error } = await supabase
      .from("ads")
      .update({ status: newStatus })
      .eq("id", ad.id);

    if (!error) {
      fetchData();
    }
  };

  const handleUpdateSettings = async (updates: Partial<AdSettings>) => {
    if (!settings) return;

    const { error } = await supabase
      .from("ad_settings")
      .update({ ...updates, updated_by: user?.id })
      .eq("id", settings.id);

    if (error) {
      toast({ title: "Failed to update settings", variant: "destructive" });
    } else {
      setSettings({ ...settings, ...updates });
      toast({ title: "Settings updated" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case "paused":
        return <Badge variant="secondary">Paused</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Scheduled</Badge>;
      case "ended":
        return <Badge variant="outline">Ended</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const calculateCTR = (impressions: number, clicks: number) => {
    if (impressions === 0) return "0%";
    return ((clicks / impressions) * 100).toFixed(2) + "%";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Ad Settings
          </CardTitle>
          <CardDescription>Configure global advertising settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Ad Frequency (every N videos)</Label>
              <Input
                id="frequency"
                type="number"
                min={1}
                max={20}
                value={settings?.ad_frequency || 5}
                onChange={(e) => handleUpdateSettings({ ad_frequency: parseInt(e.target.value) || 5 })}
              />
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="custom-ads">Enable Custom Ads</Label>
                <Switch
                  id="custom-ads"
                  checked={settings?.custom_ads_enabled ?? true}
                  onCheckedChange={(checked) => handleUpdateSettings({ custom_ads_enabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="adsense">Enable AdSense Fallback</Label>
                <Switch
                  id="adsense"
                  checked={settings?.adsense_enabled ?? false}
                  onCheckedChange={(checked) => handleUpdateSettings({ adsense_enabled: checked })}
                />
              </div>
            </div>
          </div>

          {settings?.adsense_enabled && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adsense-client">AdSense Client ID (ca-pub-xxx)</Label>
                  <Input
                    id="adsense-client"
                    placeholder="ca-pub-1234567890123456"
                    value={settings?.adsense_client_id || ""}
                    onChange={(e) => handleUpdateSettings({ adsense_client_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adsense-slot">AdSense Slot ID</Label>
                  <Input
                    id="adsense-slot"
                    placeholder="1234567890"
                    value={settings?.adsense_slot_id || ""}
                    onChange={(e) => handleUpdateSettings({ adsense_slot_id: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Ads Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ad Campaigns</CardTitle>
              <CardDescription>Manage your custom advertisement campaigns</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Ad
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingAd ? "Edit Ad" : "Create New Ad"}</DialogTitle>
                  <DialogDescription>
                    {editingAd ? "Update your ad campaign details" : "Set up a new advertisement campaign"}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="advertiser">Advertiser Name *</Label>
                      <Input
                        id="advertiser"
                        value={formData.advertiser_name}
                        onChange={(e) => setFormData({ ...formData, advertiser_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="video_url">Video URL</Label>
                      <Input
                        id="video_url"
                        placeholder="https://..."
                        value={formData.video_url}
                        onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="image_url">Image URL (fallback)</Label>
                      <Input
                        id="image_url"
                        placeholder="https://..."
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="click_url">Click URL *</Label>
                      <Input
                        id="click_url"
                        placeholder="https://..."
                        value={formData.click_url}
                        onChange={(e) => setFormData({ ...formData, click_url: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="logo_url">Advertiser Logo URL</Label>
                      <Input
                        id="logo_url"
                        placeholder="https://..."
                        value={formData.advertiser_logo_url}
                        onChange={(e) => setFormData({ ...formData, advertiser_logo_url: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value as AdStatus })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority (higher = shown first)</Label>
                    <Input
                      id="priority"
                      type="number"
                      min={1}
                      max={100}
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveAd} disabled={saving}>
                    {saving ? "Saving..." : editingAd ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {ads.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No ads created yet. Click "New Ad" to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ads.map((ad) => (
                  <TableRow key={ad.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{ad.title}</span>
                        <span className="text-sm text-muted-foreground">{ad.advertiser_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(ad.status)}</TableCell>
                    <TableCell className="text-right">{ad.impressions_count.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{ad.clicks_count.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {calculateCTR(ad.impressions_count, ad.clicks_count)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(ad)}
                        >
                          {ad.status === "active" ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(ad)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAd(ad.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a href={ad.click_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
