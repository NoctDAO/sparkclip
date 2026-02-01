import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Edit2, BarChart3, Play, Pause, Calendar, 
  ExternalLink, Upload, X, Image, Video, Hash, 
  Users, Target, TrendingUp, Eye, MousePointer,
  ArrowLeft, DollarSign, Wallet, LineChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";
import { Ad, INTEREST_CATEGORIES } from "@/types/ad";
import { BudgetStatusCard } from "@/components/advertiser/BudgetStatusCard";
import { AdPreview } from "@/components/advertiser/AdPreview";
import { LocationTargeting } from "@/components/advertiser/LocationTargeting";
import { DeviceTargeting } from "@/components/advertiser/DeviceTargeting";
import { AgeRangeTargeting } from "@/components/advertiser/AgeRangeTargeting";

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
  target_hashtags: string;
  target_creators: string;
  target_interests: string[];
  target_locations: string[];
  target_device_types: string[];
  target_age_range: { min: number; max: number } | null;
  total_budget: string;
  daily_budget: string;
  cost_per_impression: string;
  cost_per_click: string;
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
  target_hashtags: "",
  target_creators: "",
  target_interests: [],
  target_locations: [],
  target_device_types: [],
  target_age_range: null,
  total_budget: "",
  daily_budget: "",
  cost_per_impression: "0.001",
  cost_per_click: "0.01",
};

interface AdAnalyticsData {
  totalImpressions: number;
  totalClicks: number;
  totalSkips: number;
  totalCompletes: number;
  avgViewDuration: number;
}

export default function AdvertiserDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isAdvertiser, isAdmin, loading: rolesLoading } = useUserRoles(user?.id);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [formData, setFormData] = useState<AdFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [analytics, setAnalytics] = useState<Record<string, AdAnalyticsData>>({});
  const [selectedAdForAnalytics, setSelectedAdForAnalytics] = useState<string | null>(null);
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Calculate totals
  const totalImpressions = ads.reduce((sum, ad) => sum + ad.impressions_count, 0);
  const totalClicks = ads.reduce((sum, ad) => sum + ad.clicks_count, 0);
  const overallCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
  const activeAds = ads.filter(ad => ad.status === "active").length;
  const totalSpent = ads.reduce((sum, ad) => sum + (ad.total_spent || 0), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  useEffect(() => {
    if (!authLoading && !rolesLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdvertiser && !isAdmin) {
        toast({ title: "Access Denied", description: "You don't have advertiser permissions.", variant: "destructive" });
        navigate("/");
      } else {
        fetchData();
      }
    }
  }, [user, authLoading, rolesLoading, isAdvertiser, isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setAds(data as Ad[]);
      // Fetch analytics for each ad
      const analyticsPromises = data.map(ad => fetchAdAnalytics(ad.id));
      await Promise.all(analyticsPromises);
    }
    
    setLoading(false);
  };

  const fetchAdAnalytics = async (adId: string) => {
    const { data } = await supabase
      .from("ad_analytics")
      .select("*")
      .eq("ad_id", adId);

    if (data) {
      const impressions = data.filter(d => d.event_type === "impression").length;
      const clicks = data.filter(d => d.event_type === "click").length;
      const skips = data.filter(d => d.event_type === "skip").length;
      const completes = data.filter(d => d.event_type === "view_complete").length;
      const viewDurations = data.filter(d => d.view_duration_ms).map(d => d.view_duration_ms || 0);
      const avgDuration = viewDurations.length > 0 
        ? viewDurations.reduce((a, b) => a + b, 0) / viewDurations.length 
        : 0;

      setAnalytics(prev => ({
        ...prev,
        [adId]: {
          totalImpressions: impressions,
          totalClicks: clicks,
          totalSkips: skips,
          totalCompletes: completes,
          avgViewDuration: avgDuration,
        }
      }));
    }
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
        target_hashtags: ad.target_hashtags?.join(", ") || "",
        target_creators: ad.target_creators?.join(", ") || "",
        target_interests: ad.target_interests || [],
        target_locations: ad.target_locations || [],
        target_device_types: ad.target_device_types || [],
        target_age_range: ad.target_age_range as { min: number; max: number } | null,
        total_budget: ad.total_budget?.toString() || "",
        daily_budget: ad.daily_budget?.toString() || "",
        cost_per_impression: ad.cost_per_impression?.toString() || "0.001",
        cost_per_click: ad.cost_per_click?.toString() || "0.01",
      });
    } else {
      setEditingAd(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const validateFile = (file: File, type: "video" | "image" | "logo"): string | null => {
    const maxVideoSize = 50 * 1024 * 1024;
    const maxImageSize = 5 * 1024 * 1024;
    
    const allowedVideoFormats = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
    const allowedImageFormats = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (type === "video") {
      if (!allowedVideoFormats.includes(file.type)) {
        return "Invalid video format. Please use MP4, WebM, MOV, or AVI.";
      }
      if (file.size > maxVideoSize) {
        return `Video file is too large. Maximum size is 50MB.`;
      }
    } else {
      if (!allowedImageFormats.includes(file.type)) {
        return "Invalid image format. Please use JPG, PNG, GIF, or WebP.";
      }
      if (file.size > maxImageSize) {
        return `Image file is too large. Maximum size is 5MB.`;
      }
    }
    return null;
  };

  const handleFileUpload = async (
    file: File,
    type: "video" | "image" | "logo",
    setUploading: (v: boolean) => void
  ) => {
    if (!file) return;

    const validationError = validateFile(file, type);
    if (validationError) {
      toast({ title: "Upload Error", description: validationError, variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${type}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("ad-creatives")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("ad-creatives")
        .getPublicUrl(filePath);

      if (type === "video") {
        setFormData((prev) => ({ ...prev, video_url: publicUrl }));
      } else if (type === "image") {
        setFormData((prev) => ({ ...prev, image_url: publicUrl }));
      } else if (type === "logo") {
        setFormData((prev) => ({ ...prev, advertiser_logo_url: publicUrl }));
      }

      toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully` });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: `Failed to upload ${type}`, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAd = async () => {
    if (!formData.title || !formData.click_url || !formData.advertiser_name) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    if (!formData.video_url && !formData.image_url) {
      toast({ title: "Please provide a video or image", variant: "destructive" });
      return;
    }

    setSaving(true);

    const targetHashtags = formData.target_hashtags
      .split(",")
      .map(h => h.trim().replace(/^#/, ""))
      .filter(Boolean);
    const targetCreators = formData.target_creators
      .split(",")
      .map(c => c.trim())
      .filter(Boolean);

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
      target_hashtags: targetHashtags.length > 0 ? targetHashtags : null,
      target_creators: targetCreators.length > 0 ? targetCreators : null,
      target_interests: formData.target_interests.length > 0 ? formData.target_interests : null,
      target_locations: formData.target_locations.length > 0 ? formData.target_locations : null,
      target_device_types: formData.target_device_types.length > 0 ? formData.target_device_types : null,
      target_age_range: formData.target_age_range,
      total_budget: formData.total_budget ? parseFloat(formData.total_budget) : null,
      daily_budget: formData.daily_budget ? parseFloat(formData.daily_budget) : null,
      cost_per_impression: formData.cost_per_impression ? parseFloat(formData.cost_per_impression) : 0.001,
      cost_per_click: formData.cost_per_click ? parseFloat(formData.cost_per_click) : 0.01,
    };

    if (editingAd) {
      const { error } = await supabase
        .from("ads")
        .update(adData)
        .eq("id", editingAd.id);

      if (error) {
        toast({ title: "Failed to update campaign", variant: "destructive" });
      } else {
        toast({ title: "Campaign updated successfully" });
        setDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from("ads").insert(adData);

      if (error) {
        toast({ title: "Failed to create campaign", variant: "destructive" });
      } else {
        toast({ title: "Campaign created successfully" });
        setDialogOpen(false);
        fetchData();
      }
    }

    setSaving(false);
  };

  const handleToggleStatus = async (ad: Ad) => {
    const newStatus = ad.status === "active" ? "paused" : "active";
    const { error } = await supabase
      .from("ads")
      .update({ status: newStatus })
      .eq("id", ad.id);

    if (!error) {
      fetchData();
      toast({ title: `Campaign ${newStatus === "active" ? "activated" : "paused"}` });
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

  if (authLoading || rolesLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Advertiser Dashboard</h1>
              <p className="text-muted-foreground">Manage your ad campaigns and view performance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/advertiser/analytics")}>
              <LineChart className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingAd ? "Edit Campaign" : "Create New Campaign"}</DialogTitle>
                  <DialogDescription>
                    {editingAd ? "Update your ad campaign details" : "Set up a new advertisement campaign"}
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="details">Campaign Details</TabsTrigger>
                    <TabsTrigger value="preview">Live Preview</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details" className="mt-4">
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Campaign Title *</Label>
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

                {/* Video Upload */}
                <div className="space-y-4">
                  <Label>Video Creative</Label>
                  <Tabs defaultValue={formData.video_url ? "url" : "upload"} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="upload">Upload</TabsTrigger>
                      <TabsTrigger value="url">URL</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload" className="mt-2">
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "video", setUploadingVideo);
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => videoInputRef.current?.click()}
                          disabled={uploadingVideo}
                        >
                          {uploadingVideo ? (
                            "Uploading..."
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Video (max 50MB)
                            </>
                          )}
                        </Button>
                        {formData.video_url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setFormData({ ...formData, video_url: "" })}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {formData.video_url && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {formData.video_url}
                        </p>
                      )}
                    </TabsContent>
                    <TabsContent value="url" className="mt-2">
                      <Input
                        placeholder="https://example.com/video.mp4"
                        value={formData.video_url}
                        onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Image Upload */}
                <div className="space-y-4">
                  <Label>Image Creative (Fallback)</Label>
                  <Tabs defaultValue={formData.image_url ? "url" : "upload"} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="upload">Upload</TabsTrigger>
                      <TabsTrigger value="url">URL</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload" className="mt-2">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "image", setUploadingImage);
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={uploadingImage}
                        >
                          {uploadingImage ? (
                            "Uploading..."
                          ) : (
                            <>
                              <Image className="w-4 h-4 mr-2" />
                              Upload Image (max 5MB)
                            </>
                          )}
                        </Button>
                        {formData.image_url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setFormData({ ...formData, image_url: "" })}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {formData.image_url && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {formData.image_url}
                        </p>
                      )}
                    </TabsContent>
                    <TabsContent value="url" className="mt-2">
                      <Input
                        placeholder="https://example.com/image.jpg"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Advertiser Logo</Label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "logo", setUploadingLogo);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? "Uploading..." : "Upload Logo"}
                    </Button>
                    {formData.advertiser_logo_url && (
                      <>
                        <img 
                          src={formData.advertiser_logo_url} 
                          alt="Logo" 
                          className="w-10 h-10 rounded object-cover"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setFormData({ ...formData, advertiser_logo_url: "" })}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Click URL */}
                <div className="space-y-2">
                  <Label htmlFor="click_url">Click URL *</Label>
                  <Input
                    id="click_url"
                    placeholder="https://yourwebsite.com/landing"
                    value={formData.click_url}
                    onChange={(e) => setFormData({ ...formData, click_url: e.target.value })}
                  />
                </div>

                {/* Status and Dates */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: AdStatus) => setFormData({ ...formData, status: value })}
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

                {/* Targeting Options */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Targeting Options
                  </h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="target_hashtags" className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Target Hashtags
                    </Label>
                    <Input
                      id="target_hashtags"
                      placeholder="tech, gaming, lifestyle (comma-separated)"
                      value={formData.target_hashtags}
                      onChange={(e) => setFormData({ ...formData, target_hashtags: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your ad will be shown to users watching content with these hashtags
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_creators" className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Target Creators (User IDs)
                    </Label>
                    <Input
                      id="target_creators"
                      placeholder="Enter creator user IDs (comma-separated)"
                      value={formData.target_creators}
                      onChange={(e) => setFormData({ ...formData, target_creators: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Target viewers of specific creators
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Target Interests
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {INTEREST_CATEGORIES.map((category) => (
                        <div key={category.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`interest-${category.value}`}
                            checked={formData.target_interests.includes(category.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  target_interests: [...formData.target_interests, category.value],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  target_interests: formData.target_interests.filter(i => i !== category.value),
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor={`interest-${category.value}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {category.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Location Targeting */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Location Targeting
                    </Label>
                    <LocationTargeting
                      selectedLocations={formData.target_locations}
                      onLocationsChange={(locations) => setFormData({ ...formData, target_locations: locations })}
                    />
                  </div>

                  {/* Device Targeting */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Device Targeting
                    </Label>
                    <DeviceTargeting
                      selectedDevices={formData.target_device_types}
                      onDevicesChange={(devices) => setFormData({ ...formData, target_device_types: devices })}
                    />
                  </div>

                  {/* Age Range Targeting */}
                  <AgeRangeTargeting
                    ageRange={formData.target_age_range}
                    onAgeRangeChange={(range) => setFormData({ ...formData, target_age_range: range })}
                  />
                </div>

                {/* Budget Section */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Budget & Pricing
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="total_budget" className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Total Budget (USD)
                      </Label>
                      <Input
                        id="total_budget"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="No limit"
                        value={formData.total_budget}
                        onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Campaign pauses when total budget is reached
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="daily_budget" className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Daily Budget (USD)
                      </Label>
                      <Input
                        id="daily_budget"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="No limit"
                        value={formData.daily_budget}
                        onChange={(e) => setFormData({ ...formData, daily_budget: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Resets daily at midnight UTC
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cost_per_impression">Cost per Impression (CPM)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="cost_per_impression"
                          type="number"
                          min="0"
                          step="0.0001"
                          className="pl-7"
                          value={formData.cost_per_impression}
                          onChange={(e) => setFormData({ ...formData, cost_per_impression: e.target.value })}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Charged per ad view
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cost_per_click">Cost per Click (CPC)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="cost_per_click"
                          type="number"
                          min="0"
                          step="0.001"
                          className="pl-7"
                          value={formData.cost_per_click}
                          onChange={(e) => setFormData({ ...formData, cost_per_click: e.target.value })}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Charged when user clicks
                      </p>
                    </div>
                  </div>

                  {/* Budget Preview for editing */}
                  {editingAd && (
                    <div className="pt-2">
                      <BudgetStatusCard adId={editingAd.id} compact />
                    </div>
                  )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="preview" className="mt-4">
                    <div className="flex justify-center py-4">
                      <AdPreview 
                        data={{
                          title: formData.title,
                          description: formData.description,
                          video_url: formData.video_url,
                          image_url: formData.image_url,
                          click_url: formData.click_url,
                          advertiser_name: formData.advertiser_name,
                          advertiser_logo_url: formData.advertiser_logo_url,
                        }}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveAd} disabled={saving}>
                    {saving ? "Saving..." : editingAd ? "Update Campaign" : "Create Campaign"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeAds}</div>
              <p className="text-xs text-muted-foreground">of {ads.length} total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Total Impressions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MousePointer className="w-4 h-4" />
                Total Clicks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Average CTR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallCTR}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Campaigns</CardTitle>
            <CardDescription>Manage and monitor your advertising campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            {ads.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground mb-4">Create your first ad campaign to get started</p>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Schedule</TableHead>
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
                        <div className="flex items-center gap-3">
                          {ad.advertiser_logo_url ? (
                            <img
                              src={ad.advertiser_logo_url}
                              alt={ad.advertiser_name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                              {ad.video_url ? (
                                <Video className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <Image className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{ad.title}</div>
                            <div className="text-sm text-muted-foreground">{ad.advertiser_name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(ad.status)}</TableCell>
                      <TableCell>
                        <BudgetStatusCard adId={ad.id} compact />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {ad.start_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(ad.start_date).toLocaleDateString()}
                            </div>
                          )}
                          {ad.end_date && (
                            <div className="text-muted-foreground">
                              to {new Date(ad.end_date).toLocaleDateString()}
                            </div>
                          )}
                          {!ad.start_date && !ad.end_date && (
                            <span className="text-muted-foreground">No schedule</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{ad.impressions_count.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{ad.clicks_count.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {calculateCTR(ad.impressions_count, ad.clicks_count)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(ad)}
                            title={ad.status === "active" ? "Pause" : "Activate"}
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
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(ad.click_url, "_blank")}
                            title="View Landing Page"
                          >
                            <ExternalLink className="w-4 h-4" />
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
    </div>
  );
}
