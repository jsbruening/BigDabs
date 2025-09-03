"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Box,
  Chip,
  Grid,
  Fade,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,

  Tabs,
  Tab,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
} from '@mui/icons-material';
import { api } from "~/trpc/react";
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface BingoGame {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  startAt: Date;
  endAt: Date;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
  playerCount: number;
  itemCount: number;
  cardCount: number;
  items?: Array<{
    id: string;
    label: string;
    imageUrl?: string | null;
  }>;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingGame, setEditingGame] = useState<BingoGame | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPublic: true,
    startAt: new Date(),
    endAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
  });
  const [items, setItems] = useState<Array<{ label: string; imageUrl?: string }>>([]);
  const [newItem, setNewItem] = useState({ label: "", imageUrl: "" });
  const [activeTab, setActiveTab] = useState(0);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // tRPC queries and mutations
  const { data: games, isLoading, refetch } = api.bingoGame.getForAdmin.useQuery(
    { userId: session?.user?.id ?? "" },
    { enabled: !!session?.user?.id }
  );

  const createGame = api.bingoGame.create.useMutation({
    onSuccess: () => {
      void refetch();
      setOpenDialog(false);
      resetForm();
      setToast({ open: true, message: 'Game created successfully!', severity: 'success' });
    },
    onError: (error) => {
      setToast({ open: true, message: `Failed to create game: ${error.message}`, severity: 'error' });
    },
  });

  const updateGame = api.bingoGame.update.useMutation({
    onSuccess: () => {
      void refetch();
      setOpenDialog(false);
      setEditingGame(null);
      resetForm();
      setToast({ open: true, message: 'Game updated successfully!', severity: 'success' });
    },
    onError: (error) => {
      setToast({ open: true, message: `Failed to update game: ${error.message}`, severity: 'error' });
    },
  });

  const deleteGame = api.bingoGame.delete.useMutation({
    onSuccess: () => {
      void refetch();
      setToast({ open: true, message: 'Game deleted successfully!', severity: 'success' });
    },
    onError: (error) => {
      setToast({ open: true, message: `Failed to delete game: ${error.message}`, severity: 'error' });
    },
  });



  const removeItem = api.bingoGame.removeItem.useMutation({
    onSuccess: () => {
      void refetch();
      setToast({ open: true, message: 'Item removed successfully!', severity: 'success' });
    },
    onError: (error) => {
      setToast({ open: true, message: `Failed to remove item: ${error.message}`, severity: 'error' });
    },
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [status, session, router]);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      isPublic: true,
      startAt: new Date(),
      endAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });
    setItems([]);
    setNewItem({ label: "", imageUrl: "" });
    setActiveTab(0);
  };



  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingGame(null);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingGame) {
      updateGame.mutate({
        id: editingGame.id,
        ...formData,
      });
    } else {
      console.log('Creating session with items:', items);
      console.log('Form data:', formData);
      createGame.mutate({
        ...formData,
        items: items.length > 0 ? items : undefined,
      });
    }
  };

  const handleAddItem = () => {
    if (newItem.label.trim()) {
      if (items.length >= 24) {
        setToast({ open: true, message: 'Maximum 24 items allowed per game', severity: 'error' });
        return;
      }
      setItems([...items, { label: newItem.label.trim(), imageUrl: newItem.imageUrl.trim() || undefined }]);
      setNewItem({ label: "", imageUrl: "" });
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleRemoveExistingItem = (itemId: string) => {
    if (editingGame) {
      removeItem.mutate({ itemId });
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleDelete = (gameId: string) => {
    if (confirm("Are you sure you want to delete this game?")) {
      deleteGame.mutate({ id: gameId });
    }
  };

  const handleCloseToast = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

  const getGameStatus = (game: BingoGame) => {
    const now = new Date();
    if (now < game.startAt) {
      return "upcoming";
    } else if (now >= game.startAt && now <= game.endAt) {
      return "active";
    } else {
      return "completed";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "upcoming":
        return "info";
      case "completed":
        return "default";
      default:
        return "default";
    }
  };

  if (status === "loading") {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: `
            radial-gradient(circle at 20% 80%, rgba(75, 85, 99, 0.8) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(55, 65, 81, 0.9) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(31, 41, 55, 0.7) 0%, transparent 50%),
            linear-gradient(135deg, #374151 0%, #1f2937 25%, #111827 50%, #0f172a 75%, #1e293b 100%)
          `,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    );
  }

  if (!session?.user || session.user.role !== "ADMIN") {
    return null; // Will redirect via useEffect
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        sx={{
          minHeight: '100vh',
          background: `
            radial-gradient(circle at 20% 80%, rgba(75, 85, 99, 0.8) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(55, 65, 81, 0.9) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(31, 41, 55, 0.7) 0%, transparent 50%),
            linear-gradient(135deg, #374151 0%, #1f2937 25%, #111827 50%, #0f172a 75%, #1e293b 100%)
          `,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
          <Fade in timeout={800}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                <Box>
                  <Typography
                    variant="h3"
                    component="h1"
                    sx={{
                      fontWeight: 'bold',
                      color: 'white',
                      mb: 1,
                    }}
                  >
                    Big Dabs Admin
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 400 }}>
                    Manage Big Dabs games
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<AdminPanelSettingsIcon />}
                    onClick={() => router.push('/admin/users')}
                    sx={{
                      color: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      '&:hover': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    Manage Users
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => router.push('/admin/games/create')}
                    sx={{
                      backgroundColor: '#3b82f6',
                      '&:hover': {
                        backgroundColor: '#2563eb',
                      },
                    }}
                  >
                    Create Game
                  </Button>
                </Box>
              </Box>

              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress sx={{ color: 'white' }} />
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {games?.map((game) => {
                    const status = getGameStatus(game);
                    return (
                      <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={game.id}>
                        <Card
                          sx={{
                            height: '100%',
                            borderRadius: 3,
                            background: 'rgba(255, 255, 255, 0.55)',
                            backdropFilter: 'blur(25px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            overflow: 'hidden',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                              background: 'rgba(255, 255, 255, 0.65)',
                              border: '1px solid rgba(255, 255, 255, 0.3)',
                            },
                          }}
                        >
                          <CardContent sx={{ p: 3 }}>
                            {/* Header with title and status */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                              <Typography
                                variant="h6"
                                component="h3"
                                sx={{
                                  fontWeight: 'bold',
                                  lineHeight: 1.2,
                                  flex: 1,
                                  mr: 1,
                                }}
                              >
                                {game.name}
                              </Typography>
                              <Chip
                                label={status}
                                size="small"
                                color={getStatusColor(status) as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"}
                              />
                            </Box>

                            {/* Description */}
                            <Typography
                              variant="body2"
                              sx={{
                                mb: 2,
                                minHeight: '2.5em',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {game.description ?? "No description"}
                            </Typography>

                            {/* Visibility and Stats */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                              {game.isPublic ? (
                                <Chip
                                  icon={<PublicIcon />}
                                  label="Public"
                                  size="small"
                                  color="success"
                                />
                              ) : (
                                <Chip
                                  icon={<LockIcon />}
                                  label="Private"
                                  size="small"
                                  color="default"
                                />
                              )}
                            </Box>

                            {/* Stats Row */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PeopleIcon sx={{ fontSize: 18 }} />
                                <Typography variant="body2">
                                  {game.playerCount} players
                                </Typography>
                              </Box>
                              <Typography variant="body2">
                                {game.itemCount} items
                              </Typography>
                            </Box>

                            {/* Time Info */}
                            <Box sx={{ mb: 3 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                <ScheduleIcon sx={{ fontSize: 16 }} />
                                <Typography variant="caption">
                                  Start: {new Date(game.startAt).toLocaleDateString()}
                                </Typography>
                              </Box>
                              <Typography variant="caption" sx={{ ml: 3 }}>
                                End: {new Date(game.endAt).toLocaleDateString()}
                              </Typography>
                            </Box>

                            {/* Actions */}
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                              <IconButton
                                size="small"
                                onClick={() => router.push(`/admin/games/${game.id}`)}
                                color="primary"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(game.id)}
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Box>
          </Fade>
        </Container>

        {/* Create/Edit Game Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
            }
          }}
        >
          <form onSubmit={handleSubmit}>
            <DialogTitle>
              {editingGame ? "Edit Game" : "Create New Game"}
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
              <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
                <Tab label="Game Details" />
                <Tab label="Game Items" />
              </Tabs>

              {/* Tab Panel 1: Game Details */}
              {activeTab === 0 && (
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Game Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    fullWidth
                  />

                  <TextField
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    multiline
                    rows={3}
                    fullWidth
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isPublic}
                        onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                      />
                    }
                    label="Public Game"
                  />

                  <DateTimePicker
                    label="Start Time"
                    value={formData.startAt}
                    onChange={(newValue) => newValue && setFormData({ ...formData, startAt: newValue })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />

                  <DateTimePicker
                    label="End Time"
                    value={formData.endAt}
                    onChange={(newValue) => newValue && setFormData({ ...formData, endAt: newValue })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Box>
              )}

              {/* Tab Panel 2: Game Items */}
              {activeTab === 1 && (
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 3 }}>
                    Game Items
                  </Typography>

                  {/* Add new item */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <TextField
                      label="Item Label"
                      value={newItem.label}
                      onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
                      placeholder="e.g., 'Free Space', 'Dancing', 'Singing'"
                      sx={{ flexGrow: 1 }}
                    />
                    <TextField
                      label="Image URL (optional)"
                      value={newItem.imageUrl}
                      onChange={(e) => setNewItem({ ...newItem, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      sx={{ flexGrow: 1 }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleAddItem}
                      disabled={!newItem.label.trim()}
                      sx={{ minWidth: 100 }}
                    >
                      Add Item
                    </Button>
                  </Box>

                  {/* Display new items being added */}
                  {items.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                        New Items ({items.length})
                      </Typography>
                      <Box sx={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 1, p: 1 }}>
                        {items.map((item, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              p: 1.5,
                              mb: 1,
                              backgroundColor: '#f5f5f5',
                              borderRadius: 1,
                              border: '1px solid #e0e0e0',
                            }}
                          >
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {item.label}
                              </Typography>
                              {item.imageUrl && (
                                <Typography variant="caption" color="text.secondary">
                                  {item.imageUrl}
                                </Typography>
                              )}
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveItem(index)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Display existing session items when editing */}
                  {editingGame?.items && editingGame.items.length > 0 && (
                    <Box>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                        Existing Items ({editingGame.items?.length ?? 0})
                      </Typography>
                      <Box sx={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 1, p: 1 }}>
                        {editingGame.items?.map((item) => (
                          <Box
                            key={item.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              p: 1.5,
                              mb: 1,
                              backgroundColor: '#e3f2fd',
                              borderRadius: 1,
                              border: '1px solid #bbdefb',
                            }}
                          >
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {item.label}
                              </Typography>
                              {item.imageUrl && (
                                <Typography variant="caption" color="text.secondary">
                                  {item.imageUrl}
                                </Typography>
                              )}
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveExistingItem(item.id)}
                              color="error"
                              disabled={removeItem.isPending}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {items.length === 0 && (!editingGame?.items || editingGame.items.length === 0) && (
                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      <Typography variant="body1">
                        No items added yet. Add some bingo items above to get started!
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </DialogContent>

            {(createGame.error ?? updateGame.error) && (
              <Alert severity="error" sx={{ mx: 3, mb: 2 }}>
                {createGame.error?.message ?? updateGame.error?.message}
              </Alert>
            )}
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={createGame.isPending ?? updateGame.isPending}
              >
                {createGame.isPending ?? updateGame.isPending ? (
                  <CircularProgress size={20} />
                ) : editingGame ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Toast Notifications */}
        <Snackbar
          open={toast.open}
          autoHideDuration={6000}
          onClose={handleCloseToast}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={handleCloseToast}
            severity={toast.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
}
