"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
 Drawer,
 Box,
 Typography,
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
 Snackbar,
} from "@mui/material";
import {
 Close as CloseIcon,
 Save as SaveIcon,
 Cancel as CancelIcon,
 CloudUpload as CloudUploadIcon,
} from "@mui/icons-material";

interface ProfileDrawerProps {
 open: boolean;
 onClose: () => void;
}

interface Profile {
 id: string;
 name: string | null;
 email: string | null;
 image: string | null;
 role: string;
 isOAuth: boolean;
}

export function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
 const { data: session, update } = useSession();
 const [profile, setProfile] = useState<Profile | null>(null);
 const [formData, setFormData] = useState({
  name: "",
  email: "",
 });
 const [saving, setSaving] = useState(false);
 const [success, setSuccess] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);

 // Initialize profile data when drawer opens
 useEffect(() => {
  const init = async () => {
   if (!(open && session?.user)) return;

   try {
    // Ask server whether this account is OAuth (no password) or credentials
    const res = await fetch("/api/profile/check-auth-type", { cache: "no-store" });
    const data = await res.json() as { isOAuth?: boolean };
    const isOAuth = Boolean(data.isOAuth);

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
   } catch {
    // Fallback: keep previous profile if any
    setProfile(prev => prev ?? null);
   }
  };

  void init();
 }, [open, session]);

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({
   ...prev,
   [name]: value
  }));
 };

 const handleCancel = () => {
  // setIsEditing(true); // Removed as per edit hint
  setFormData({
   name: profile?.name ?? "",
   email: profile?.email ?? "",
  });
 };

 const handleSave = async () => {
  if (!profile) return;

  setSaving(true);
  setError(null);

  try {
   const response = await fetch("/api/profile/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
     name: formData.name,
     email: formData.email,
    }),
   });

   const data = await response.json() as { error?: string };

   if (!response.ok) {
    throw new Error(data.error ?? "Failed to update profile");
   }

   setProfile(prev => prev ? {
    ...prev,
    name: formData.name,
    email: formData.email,
   } : null);

   setSuccess("Profile updated successfully!");

   // Update the session to reflect changes (propagate name into JWT)
   await update({ user: { name: formData.name } as unknown as undefined });

  } catch (err) {
   setError(err instanceof Error ? err.message : "Failed to update profile");
  } finally {
   setSaving(false);
  }
 };

 const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!profile || profile.isOAuth) return;

  const file = e.target.files?.[0];
  if (!file) return;

  setSaving(true);
  setError(null);

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

 if (!session?.user) {
  return null;
 }

 return (
  <>
   <Drawer
    anchor="right"
    open={open}
    onClose={onClose}
    sx={{
     "& .MuiDrawer-paper": {
      width: 400,
      padding: 2,
     },
    }}
   >
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
     <Typography variant="h6">Profile</Typography>
     <IconButton onClick={onClose}>
      <CloseIcon />
     </IconButton>
    </Box>

    <Divider sx={{ mb: 2 }} />

    <Card>
     <CardContent>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 2 }}>
       <Box sx={{ position: "relative" }}>
        <Avatar
         src={profile?.image ?? undefined}
         sx={{ width: 100, height: 100, mb: 1 }}
        />
        {profile && profile.isOAuth === false && (
         <Tooltip title="Upload Avatar">
          <IconButton
           component="label"
           sx={{
            position: "absolute",
            bottom: 0,
            right: 0,
            bgcolor: "primary.main",
            color: "white",
            "&:hover": { bgcolor: "primary.dark" },
           }}
           size="small"
          >
           <CloudUploadIcon />
           <input
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatarUpload}
            disabled={saving}
           />
          </IconButton>
         </Tooltip>
        )}
       </Box>

       <Typography variant="h6" gutterBottom>
        {profile?.name ?? "No name"}
       </Typography>

       <Typography variant="body2" color="text.secondary" gutterBottom>
        {profile?.email}
       </Typography>

       <Typography variant="body2" color="text.secondary">
        {profile?.role}
       </Typography>
      </Box>

      {profile && profile.isOAuth === false && (
       <>
        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
         <Typography variant="subtitle1">Edit Profile</Typography>
         <Box>
          <Button
           startIcon={<SaveIcon />}
           onClick={handleSave}
           variant="contained"
           size="small"
           disabled={saving}
           sx={{ mr: 1 }}
          >
           {saving ? <CircularProgress size={16} /> : "Save"}
          </Button>
          <Button
           startIcon={<CancelIcon />}
           onClick={handleCancel}
           variant="outlined"
           size="small"
           disabled={saving}
          >
           Cancel
          </Button>
         </Box>
        </Box>

        {/* Always show form; email is read-only */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
         <TextField
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          fullWidth
          disabled={saving}
         />
         <TextField
          label="Email"
          name="email"
          value={formData.email}
          fullWidth
          disabled
          helperText="Email cannot be changed"
         />
        </Box>
       </>
      )}

      {profile?.isOAuth && (
       <Alert severity="info" sx={{ mt: 2 }}>
        Profile name and avatar are managed by your OAuth provider.
       </Alert>
      )}
     </CardContent>
    </Card>
   </Drawer>

   <Snackbar
    open={!!success}
    autoHideDuration={4000}
    onClose={() => setSuccess(null)}
    message={success}
   />

   <Snackbar
    open={!!error}
    autoHideDuration={6000}
    onClose={() => setError(null)}
    message={error}
   />
  </>
 );
}
