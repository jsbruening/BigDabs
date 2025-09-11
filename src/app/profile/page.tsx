"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
 Container,
 Paper,
 Typography,
 Box,
 Avatar,
 TextField,
 Button,
 Alert,
 CircularProgress,
 Divider,
 Card,
 CardContent,
 IconButton,
 Tooltip,
} from "@mui/material";
import {
 Edit as EditIcon,
 Save as SaveIcon,
 Cancel as CancelIcon,
 PhotoCamera as PhotoCameraIcon,
} from "@mui/icons-material";

interface UserProfile {
 id: string;
 name: string | null;
 email: string | null;
 image: string | null;
 role: "USER" | "ADMIN";
 isOAuth: boolean;
}

export default function ProfilePage() {
 const { data: session, update } = useSession();
 const router = useRouter();
 const [profile, setProfile] = useState<UserProfile | null>(null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [editing, setEditing] = useState(false);
 const [error, setError] = useState("");
 const [success, setSuccess] = useState("");
 const [formData, setFormData] = useState({
  name: "",
  email: "",
 });

 // Check if user is authenticated
 useEffect(() => {
  console.log("Profile useEffect - status:", status, "session:", session);

  // Don't redirect if session is still loading, undefined, or empty
  if (status === "loading" || status === undefined || status === "") {
   console.log("Session still loading, waiting...");
   return;
  }

  // If session is loaded but no user, redirect to signin
  if (status === "unauthenticated" || !session?.user) {
   console.log("No session or user, redirecting to signin");
   router.push("/signin");
   return;
  }

  console.log("Session loaded successfully, user:", session.user);

  // Determine auth type from session data (no API call needed)
  const isOAuth = !session.user.image?.startsWith("http");

  console.log("Profile debug:", {
   image: session.user.image,
   isOAuth,
   name: session.user.name,
   email: session.user.email
  });

  setProfile({
   id: session.user.id,
   name: session.user.name ?? null,
   email: session.user.email ?? null,
   image: session.user.image ?? null,
   role: session.user.role,
   isOAuth,
  });

  setFormData({
   name: session.user.name ?? "",
   email: session.user.email ?? "",
  });

  setLoading(false);
 }, [session, router]);

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({
   ...prev,
   [name]: value
  }));
 };

 const handleSave = async () => {
  if (!profile) return;

  setSaving(true);
  setError("");
  setSuccess("");

  try {
   const response = await fetch("/api/profile/update", {
    method: "POST",
    headers: {
     "Content-Type": "application/json",
    },
    body: JSON.stringify({
     name: formData.name,
     // Only allow email changes for non-OAuth users
     ...(profile.isOAuth ? {} : { email: formData.email }),
    }),
   });

   const data = await response.json() as { error?: string; success?: boolean };

   if (!response.ok) {
    throw new Error(data.error ?? "Failed to update profile");
   }

   setSuccess("Profile updated successfully!");
   setEditing(false);

   // Update local profile state
   setProfile(prev => prev ? {
    ...prev,
    name: formData.name,
    ...(profile.isOAuth ? {} : { email: formData.email }),
   } : null);

   // Simple session update
   await update();

  } catch (err) {
   setError(err instanceof Error ? err.message : "Failed to update profile");
  } finally {
   setSaving(false);
  }
 };

 const handleCancel = () => {
  setFormData({
   name: profile?.name ?? "",
   email: profile?.email ?? "",
  });
  setEditing(false);
  setError("");
  setSuccess("");
 };

 const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  if (profile?.isOAuth) return; // Only allow for email users

  const file = event.target.files?.[0];
  if (!file) return;

  // Basic validation
  if (!file.type.startsWith("image/")) {
   setError("Please select an image file");
   return;
  }

  if (file.size > 5 * 1024 * 1024) { // 5MB limit
   setError("Image size must be less than 5MB");
   return;
  }

  setSaving(true);
  setError("");

  try {
   const formData = new FormData();
   formData.append("avatar", file);

   const response = await fetch("/api/profile/avatar", {
    method: "POST",
    body: formData,
   });

   const data = await response.json() as { error?: string; imageUrl?: string };

   if (!response.ok) {
    throw new Error(data.error ?? "Failed to upload avatar");
   }

   setSuccess("Avatar updated successfully!");

   // Update local profile state
   setProfile(prev => prev ? { ...prev, image: data.imageUrl ?? null } : null);

   // Update the session to reflect the new avatar
   await update();

  } catch (err) {
   setError(err instanceof Error ? err.message : "Failed to upload avatar");
  } finally {
   setSaving(false);
  }
 };

 if (loading) {
  return (
   <Container maxWidth="md" sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
    <CircularProgress />
   </Container>
  );
 }

 if (!profile) {
  return (
   <Container maxWidth="md" sx={{ mt: 4 }}>
    <Alert severity="error">Profile not found</Alert>
   </Container>
  );
 }

 return (
  <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
   <Paper elevation={3} sx={{ p: 4 }}>
    <Typography variant="h4" component="h1" gutterBottom>
     Profile
    </Typography>

    <Divider sx={{ mb: 4 }} />

    <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 4 }}>
     {/* Avatar Section */}
     <Box sx={{ flex: { xs: "1", md: "0 0 300px" } }}>
      <Card>
       <CardContent sx={{ textAlign: "center" }}>
        <Box sx={{ position: "relative", display: "inline-block" }}>
         <Avatar
          src={profile.image ?? undefined}
          alt={profile.name ?? "User"}
          sx={{
           width: 120,
           height: 120,
           mx: "auto",
           mb: 2,
           border: "3px solid",
           borderColor: "primary.main",
          }}
         />
         {!profile.isOAuth && (
          <Tooltip title="Upload Avatar">
           <IconButton
            component="label"
            sx={{
             position: "absolute",
             bottom: 8,
             right: 8,
             backgroundColor: "primary.main",
             color: "white",
             "&:hover": {
              backgroundColor: "primary.dark",
             },
            }}
            size="small"
           >
            <PhotoCameraIcon />
            <input
             type="file"
             hidden
             accept="image/*"
             onChange={handleAvatarUpload}
            />
           </IconButton>
          </Tooltip>
         )}
        </Box>
        <Typography variant="h6" gutterBottom>
         {profile.name ?? "User"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
         {profile.role === "ADMIN" ? "Administrator" : "User"}
        </Typography>
        {profile.isOAuth && (
         <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          Avatar managed by OAuth provider
         </Typography>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
         Debug: isOAuth = {profile.isOAuth ? "true" : "false"} | Auth Type = {profile.isOAuth ? "OAuth" : "Email/Password"}
        </Typography>
       </CardContent>
      </Card>
     </Box>

     {/* Profile Information */}
     <Box sx={{ flex: 1 }}>
      <Card>
       <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
         <Typography variant="h6">Profile Information</Typography>
         {!editing ? (
          <Button
           startIcon={<EditIcon />}
           onClick={() => setEditing(true)}
           variant="outlined"
          >
           Edit
          </Button>
         ) : (
          <Box sx={{ display: "flex", gap: 1 }}>
           <Button
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            variant="contained"
            size="small"
           >
            {saving ? "Saving..." : "Save"}
           </Button>
           <Button
            startIcon={<CancelIcon />}
            onClick={handleCancel}
            disabled={saving}
            variant="outlined"
            size="small"
           >
            Cancel
           </Button>
          </Box>
         )}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
         Debug: isOAuth = {profile.isOAuth ? "true" : "false"} | Auth Type = {profile.isOAuth ? "OAuth" : "Email/Password"}
        </Typography>

        {error && (
         <Alert severity="error" sx={{ mb: 2 }}>
          {error}
         </Alert>
        )}

        {success && (
         <Alert severity="success" sx={{ mb: 2 }}>
          {success}
         </Alert>
        )}

        <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
         <TextField
          label="Display Name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          disabled={!editing}
          fullWidth
          required
         />

         <TextField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          disabled={!editing || profile.isOAuth}
          fullWidth
          required
          helperText={profile.isOAuth ? "Email managed by OAuth provider" : ""}
         />

         <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
           <strong>Account Type:</strong> {profile.isOAuth ? "OAuth (Google/GitHub/Discord)" : "Email/Password"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
           <strong>User ID:</strong> {profile.id}
          </Typography>
         </Box>
        </Box>
       </CardContent>
      </Card>
     </Box>
    </Box>
   </Paper>
  </Container>
 );
}