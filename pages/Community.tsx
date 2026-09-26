import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles, Heart, MessageSquare, Share2, Send,
  ShieldCheck, MessageCircle, Plus
} from "lucide-react";
import { toast } from "sonner";
import { createCommunityPost, listCommunityPosts, toggleCommunityPostLike, type CommunityPost as Post } from "@/lib/supabase";

export default function CommunityPage() {
  const [, setLocation] = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [postInput, setPostInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("General");

  const loadPosts = async () => {
    try {
      setPosts(await listCommunityPosts());
    } catch (error: any) {
      toast.error(error?.message || "Could not load community posts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleCreatePost = async () => {
    if (!postInput.trim()) {
      toast.error("Please enter some text for your post.");
      return;
    }

    setIsPublishing(true);
    try {
      await createCommunityPost(postInput, selectedCategory);
      setPostInput("");
      await loadPosts();
      toast.success("Post published to Community Feed!");
    } catch (error: any) {
      toast.error(error?.message || "Could not publish your post.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleToggleLike = async (id: string) => {
    const post = posts.find((item) => item.id === id);
    if (!post) return;
    try {
      const isLiked = await toggleCommunityPostLike(id);
      setPosts((current) => current.map((item) => item.id === id
        ? { ...item, isLiked, likesCount: item.likesCount + (isLiked ? 1 : -1) }
        : item));
    } catch (error: any) {
      toast.error(error?.message || "Could not update this like.");
    }
  };

  const handleSharePost = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/community#${id}`);
      toast.success("Post link copied.");
    } catch {
      toast.error("Could not copy the post link.");
    }
  };

  const handleMessageUser = (authorName: string) => {
    toast.info(`Opening conversation with ${authorName}...`);
    setLocation("/messages");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-500" />
            Community Feed & Discussions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Share knowledge, ask questions, or announce skill swap opportunities.
          </p>
        </div>

        {/* CREATE POST CARD */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-500" />
              Share an Update or Opportunity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="What skill are you working on or looking to trade today?..."
              value={postInput}
              onChange={(e) => setPostInput(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white min-h-[80px]"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-9 w-40 text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {["General", "Design", "Technology", "Marketing", "Wellness", "Languages"].map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCreatePost}
                disabled={isPublishing}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {isPublishing ? "Publishing..." : "Publish Post"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* POSTS FEED LIST */}
        <div className="space-y-5">
          {!isLoading && posts.length === 0 && (
            <Card className="border-dashed border-slate-300 bg-white text-center dark:border-slate-700 dark:bg-slate-900">
              <CardContent className="py-12 text-sm text-slate-500 dark:text-slate-400">
                The community feed is quiet. Share the first update.
              </CardContent>
            </Card>
          )}
          {isLoading && <p className="py-8 text-center text-xs text-slate-500">Loading community posts...</p>}
          {posts.map((post) => (
            <Card id={post.id} key={post.id} className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={post.authorAvatar} alt={post.authorName} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      {post.authorName}
                      {post.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />}
                    </h4>
                    <p className="text-[10px] text-slate-400">{post.authorRole} • {post.timestamp}</p>
                  </div>
                </div>

                <Badge variant="secondary" className="text-[10px]">
                  {post.category}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  {post.content}
                </p>

              </CardContent>

              <CardFooter className="px-4 py-3 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  {/* Like Button */}
                  <button
                    type="button"
                    disabled={post.id.startsWith("local-")}
                    onClick={() => handleToggleLike(post.id)}
                    className={`flex items-center gap-1 font-semibold transition-colors ${
                      post.isLiked ? "text-rose-500" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${post.isLiked ? "fill-rose-500" : ""}`} />
                    <span>{post.likesCount}</span>
                  </button>

                  {/* Comment Button */}
                  <button type="button" onClick={() => toast.info("Comments are not available yet.")} className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium">
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.commentsCount}</span>
                  </button>

                  {/* Share Button */}
                  <button type="button" onClick={() => handleSharePost(post.id)} className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium">
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>

                {/* Direct Message User CTA */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMessageUser(post.authorName)}
                  className="text-xs border-slate-200 dark:border-slate-800 gap-1"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-indigo-500" />
                  Message User
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
