"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  IconButton,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Chip,
  CircularProgress,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { Delete as DeleteIcon, Edit as EditIcon, DeleteSweep as DeleteSweepIcon, Refresh as RefreshIcon, People as PeopleIcon } from "@mui/icons-material";

export default function EditSessionPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id ?? '';
  const router = useRouter();
  const { data: session, status } = useSession();
  const utils = api.useUtils();

  const { data: gameData, refetch, error: gameError, isLoading: gameLoading } = api.bingoGame.getById.useQuery({ id: sessionId }, { enabled: !!sessionId });
  const updateGame = api.bingoGame.update.useMutation({ onSuccess: () => refetch() });
  const addItems = api.bingoGame.addItems.useMutation({ onSuccess: () => refetch() });
  const updateItem = api.bingoGame.updateItem.useMutation({ onSuccess: () => refetch() });
  const deleteItemsBulk = api.bingoGame.deleteItemsBulk.useMutation({ onSuccess: () => refetch() });
  const deleteGame = api.bingoGame.delete.useMutation({
    onSuccess: () => {
      setToast({ open: true, message: 'Game deleted successfully', severity: 'success' });
      router.push('/admin');
    },
    onError: (error) => {
      setToast({ open: true, message: `Failed to delete game: ${error.message}`, severity: 'error' });
    }
  });
  const regenerateCard = api.bingoGame.regenerateCard.useMutation({
    onSuccess: () => {
      void refetch();
      // Also invalidate the specific queries that the regular game page uses
      void utils.bingoGame.getParticipants.invalidate({ gameId: sessionId });
      void utils.bingoGame.getById.invalidate({ id: sessionId });
      void utils.bingoGame.getWinners.invalidate({ gameId: sessionId });
    }
  });

  // Get participants for this game
  const { data: participants } = api.bingoGame.getParticipants.useQuery(
    { gameId: sessionId },
    { enabled: !!sessionId }
  );

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPublic: true,
    startAt: new Date(),
    endAt: new Date(),
  });

  const [newItem, setNewItem] = useState({ label: "" });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState({ label: "" });
  const [centerSquare, setCenterSquare] = useState({ label: "" });
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'info' });
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [regenerateDialog, setRegenerateDialog] = useState<{ open: boolean; participantId: string; participantName: string }>({ open: false, participantId: '', participantName: '' });
  const [deleteGameDialogOpen, setDeleteGameDialogOpen] = useState(false);

  useEffect(() => {
    if (!gameData || isFormInitialized) return;

    setFormData({
      name: gameData.name ?? "",
      description: gameData.description ?? "",
      isPublic: gameData.isPublic ?? true,
      startAt: gameData.startAt ? new Date(gameData.startAt) : new Date(),
      endAt: gameData.endAt ? new Date(gameData.endAt) : new Date(),
    });

    // Set center square data if it exists
    if (gameData.centerSquare) {
      const centerSquare = gameData.centerSquare as { label?: string };
      setCenterSquare({
        label: centerSquare.label ?? "",
      });
    } else {
      // Ensure centerSquare always has default values
      setCenterSquare({ label: "" });
    }

    setIsFormInitialized(true);
  }, [gameData, isFormInitialized]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/signin");
    if (status === "authenticated" && session?.user?.role !== "ADMIN") router.push("/");
  }, [status, session, router]);

  const allItemIds = useMemo(() => (gameData?.items ?? []).map((i) => i.id), [gameData]);
  const allSelected = selectedIds.length > 0 && selectedIds.length === allItemIds.length;
  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : allItemIds);
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSaveDetails = () => {
    const centerSquareData = centerSquare.label.trim() ? { label: centerSquare.label.trim() } : undefined;

    updateGame.mutate({
      id: sessionId,
      ...formData,
      centerSquare: centerSquareData,
    }, {
      onSuccess: () => {
        setToast({ open: true, message: 'Game details saved', severity: 'success' });
        // Reset the form initialization flag so it can be re-initialized with fresh data
        setIsFormInitialized(false);
      },
      onError: (e) => setToast({ open: true, message: `Failed to save: ${e instanceof Error ? e.message : 'Unknown error'}`, severity: 'error' })
    });
  };

  const handleResetForm = () => {
    if (!gameData) return;
    setFormData({
      name: gameData.name ?? "",
      description: gameData.description ?? "",
      isPublic: gameData.isPublic ?? true,
      startAt: gameData.startAt ? new Date(gameData.startAt) : new Date(),
      endAt: gameData.endAt ? new Date(gameData.endAt) : new Date(),
    });

    if (gameData.centerSquare) {
      const centerSquare = gameData.centerSquare as { label?: string };
      setCenterSquare({
        label: centerSquare.label ?? "",
      });
    } else {
      setCenterSquare({ label: "" });
    }
  };

  const handleAddItem = () => {
    if (!newItem.label.trim()) return;
    if ((gameData?.items?.length ?? 0) >= 24) {
      setToast({ open: true, message: 'Maximum 24 items allowed per game', severity: 'error' });
      return;
    }
    addItems.mutate({ gameId: sessionId, items: [{ label: newItem.label.trim() }] }, { onSuccess: () => setToast({ open: true, message: 'Item added', severity: 'success' }), onError: (e) => setToast({ open: true, message: `Failed to add item: ${e instanceof Error ? e.message : 'Unknown error'}`, severity: 'error' }) });
    setNewItem({ label: "" });
  };

  const handleEditItem = (id: string, label: string) => {
    setEditingItemId(id);
    setEditingItem({ label: label ?? "" });
  };
  const handleSaveItem = () => {
    if (!editingItemId) return;
    updateItem.mutate({ itemId: editingItemId, label: editingItem.label.trim() }, { onSuccess: () => setToast({ open: true, message: 'Item updated', severity: 'success' }), onError: (e) => setToast({ open: true, message: `Failed to update item: ${e instanceof Error ? e.message : 'Unknown error'}`, severity: 'error' }) });
    setEditingItemId(null);
    setEditingItem({ label: "" });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    deleteItemsBulk.mutate({ itemIds: selectedIds }, { onSuccess: () => setToast({ open: true, message: 'Selected items deleted', severity: 'success' }), onError: (e) => setToast({ open: true, message: `Failed to delete items: ${e instanceof Error ? e.message : 'Unknown error'}`, severity: 'error' }) });
    setSelectedIds([]);
  };

  const handleDeleteGame = () => {
    setDeleteGameDialogOpen(true);
  };

  const confirmDeleteGame = () => {
    deleteGame.mutate({ id: sessionId });
    setDeleteGameDialogOpen(false);
  };


  const handleCloseToast = () => setToast(prev => ({ ...prev, open: false }));

  const handleRegenerateCard = (participantId: string, participantName: string) => {
    setRegenerateDialog({ open: true, participantId, participantName });
  };

  const confirmRegenerateCard = () => {
    regenerateCard.mutate(
      { gameId: sessionId, participantId: regenerateDialog.participantId },
      {
        onSuccess: (data) => {
          const message = data.hadWinnerStatus
            ? `Card regenerated for ${regenerateDialog.participantName} (Winner status removed - was ${data.removedWinnerPlace}${data.removedWinnerPlace === 1 ? 'st' : data.removedWinnerPlace === 2 ? 'nd' : data.removedWinnerPlace === 3 ? 'rd' : 'th'} place)`
            : `Card regenerated for ${regenerateDialog.participantName}`;
          setToast({ open: true, message, severity: 'success' });
          setRegenerateDialog({ open: false, participantId: '', participantName: '' });
        },
        onError: (error) => {
          setToast({ open: true, message: `Failed to regenerate card: ${error.message}`, severity: 'error' });
        },
      }
    );
  };

  // Loading states
  if (status === "loading" || gameLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography variant="h6" sx={{ color: 'white' }}>Loading...</Typography>
      </Box>
    );
  }

  // Authentication checks
  if (!session?.user || session.user.role !== "ADMIN") {
    router.push("/");
    return null;
  }

  // Error handling
  if (gameError) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6" sx={{ color: 'white' }}>Game not found</Typography>
        <Button variant="contained" onClick={() => router.push("/admin")}>
          Back to Admin
        </Button>
      </Box>
    );
  }

  // No game data
  if (!gameData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography variant="h6" sx={{ color: 'white' }}>Loading game data...</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        sx={{
          background: `
            radial-gradient(circle at 20% 80%, rgba(75, 85, 99, 0.8) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(55, 65, 81, 0.9) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(31, 41, 55, 0.7) 0%, transparent 50%),
            linear-gradient(135deg, #374151 0%, #1f2937 25%, #111827 50%, #0f172a 75%, #1e293b 100%)
          `,
          position: 'relative',
          minHeight: '100vh',
          paddingBottom: 4,
        }}
      >
        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 4, minHeight: '100vh' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
              Edit Session
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteGame}
              disabled={deleteGame.isPending}
              sx={{
                borderColor: 'rgba(239, 68, 68, 0.5)',
                color: 'rgba(239, 68, 68, 0.9)',
                '&:hover': {
                  borderColor: 'rgba(239, 68, 68, 0.8)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                },
              }}
            >
              Delete Game
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', xl: 'row' } }}>
            {/* Left: Session details (1/3) */}
            <Box sx={{ flex: { xs: '1 1 100%', xl: '0 0 33.333%' }, minWidth: 0 }}>
              <Paper sx={{ p: 2, height: 'fit-content' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Session Details
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    label="Session Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <TextField
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    multiline
                    rows={3}
                  />
                  <FormControlLabel control={<Switch checked={formData.isPublic} onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })} />} label="Public Session" />
                  <DateTimePicker
                    label="Start Time"
                    value={formData.startAt}
                    onChange={(d) => d && setFormData({ ...formData, startAt: d })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                  <DateTimePicker
                    label="End Time"
                    value={formData.endAt}
                    onChange={(d) => d && setFormData({ ...formData, endAt: d })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />

                  {/* Center Square Input */}
                  <Box sx={{ mt: 2, p: 2, backgroundColor: '#f3f4f6', border: '2px dashed #d1d5db', borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#374151' }}>
                      🎯 Center Square (Free Space)
                    </Typography>
                    <Typography variant="caption" sx={{ mb: 2, color: '#6b7280', display: 'block' }}>
                      This item will automatically be marked as &quot;dabbed&quot; in the center of every bingo card. Leave empty to use &quot;Free&quot; as default.
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <TextField
                        label="Center Square Label"
                        value={centerSquare.label}
                        onChange={(e) => setCenterSquare({ ...centerSquare, label: e.target.value })}
                        placeholder="e.g., 'Free', 'Dab Time'"
                        size="small"
                        fullWidth
                      />
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Button variant="contained" onClick={handleSaveDetails} disabled={updateGame.isPending}>
                      {updateGame.isPending ? "Saving..." : "Save Details"}
                    </Button>
                    <Button variant="outlined" onClick={handleResetForm} disabled={updateGame.isPending}>
                      Reset to Server Values
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </Box>

            {/* Right: Items grid (2/3) */}
            <Box sx={{ flex: { xs: '1 1 100%', xl: '0 0 66.666%' }, minWidth: 0 }}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Game Items ({gameData.items?.length ?? 0})
                </Typography>

                {/* Add New Item Section */}
                <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f8fafc' }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Add New Item
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                    <TextField
                      label="Item Label"
                      value={newItem.label}
                      onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
                      sx={{ flexGrow: 1, minWidth: 0 }}
                      size="small"
                    />
                    <Button
                      variant="contained"
                      onClick={handleAddItem}
                      disabled={!newItem.label.trim() || addItems.isPending || (gameData?.items?.length ?? 0) >= 24}
                      sx={{ minWidth: 100 }}
                      size="small"
                    >
                      Add
                    </Button>
                  </Box>
                </Paper>

                {/* Items Table Section */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Current Items
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Delete selected items">
                      <span>
                        <IconButton
                          color="error"
                          onClick={handleBulkDelete}
                          disabled={selectedIds.length === 0 || deleteItemsBulk.isPending}
                          sx={{
                            backgroundColor: selectedIds.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                            '&:hover': {
                              backgroundColor: selectedIds.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                            },
                            '&:disabled': {
                              backgroundColor: 'transparent',
                              opacity: 0.3,
                            }
                          }}
                        >
                          <DeleteSweepIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>

                  <TableContainer component={Paper} sx={{ flex: 1, minHeight: 0 }}>
                    <Table stickyHeader size="small" aria-label="bingo items table">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              indeterminate={selectedIds.length > 0 && !allSelected}
                              checked={allSelected}
                              onChange={toggleAll}
                              inputProps={{ 'aria-label': 'select all items' }}
                            />
                          </TableCell>
                          <TableCell>Item Label</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(!gameData.items || gameData.items.length === 0) ? (
                          <TableRow>
                            <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                              <Typography variant="body1" color="text.secondary">
                                No items added yet. Add some bingo items above to get started!
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          (gameData.items ?? []).map((item) => {
                            const isEditing = editingItemId === item.id;
                            const isSelected = selectedIds.includes(item.id);

                            return (
                              <TableRow
                                key={item.id}
                                hover
                                selected={isSelected}
                                sx={{
                                  '&.Mui-selected': {
                                    backgroundColor: 'action.selected',
                                  },
                                  '&.Mui-selected:hover': {
                                    backgroundColor: 'action.hover',
                                  }
                                }}
                              >
                                <TableCell padding="checkbox">
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={() => toggleOne(item.id)}
                                    inputProps={{ 'aria-label': `select item ${item.label}` }}
                                  />
                                </TableCell>
                                <TableCell component="th" scope="row">
                                  {isEditing ? (
                                    <TextField
                                      size="small"
                                      value={editingItem.label}
                                      onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                                      fullWidth
                                      variant="outlined"
                                    />
                                  ) : (
                                    item.label
                                  )}
                                </TableCell>
                                <TableCell align="right">
                                  {isEditing ? (
                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        onClick={handleSaveItem}
                                        disabled={updateItem.isPending}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => setEditingItemId(null)}
                                      >
                                        Cancel
                                      </Button>
                                    </Box>
                                  ) : (
                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                      <Tooltip title="Edit item">
                                        <IconButton
                                          size="small"
                                          onClick={() => handleEditItem(item.id, item.label)}
                                          aria-label={`edit item ${item.label}`}
                                        >
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Delete item">
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() => deleteItemsBulk.mutate({ itemIds: [item.id] })}
                                          disabled={deleteItemsBulk.isPending}
                                          aria-label={`delete item ${item.label}`}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Paper>

              {/* Participants Section */}
              <Paper sx={{ p: 3, mt: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PeopleIcon />
                  Participants ({participants?.length ?? 0})
                </Typography>

                {participants && participants.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Player</TableCell>
                          <TableCell>Joined</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {participants.map((participant) => (
                          <TableRow key={participant.id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar
                                  src={participant.user.image ?? undefined}
                                  sx={{ width: 32, height: 32 }}
                                >
                                  {participant.user.name?.charAt(0)}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight="medium">
                                    {participant.user.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {participant.user.email}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {new Date(participant.joinedAt).toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label="Active"
                                color="success"
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Regenerate Card">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleRegenerateCard(participant.id, participant.user.name ?? 'Unknown')}
                                  disabled={regenerateCard.isPending}
                                  aria-label={`regenerate card for ${participant.user.name}`}
                                >
                                  <RefreshIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No participants yet
                  </Typography>
                )}
              </Paper>
            </Box>
          </Box>
        </Container>
      </Box>
      <Snackbar open={toast.open} autoHideDuration={6000} onClose={handleCloseToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={handleCloseToast} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>

      {/* Regenerate Card Confirmation Dialog */}
      <Dialog open={regenerateDialog.open} onClose={() => setRegenerateDialog({ open: false, participantId: '', participantName: '' })}>
        <DialogTitle>Regenerate Card</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to regenerate the bingo card for <strong>{regenerateDialog.participantName}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will create a new random card layout with the same game items and clear all current markings.
          </Typography>
          <Typography variant="body2" color="warning.main" sx={{ mt: 1, fontWeight: 600 }}>
            ⚠️ If this player has already claimed bingo, their winner status will be removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegenerateDialog({ open: false, participantId: '', participantName: '' })}>
            Cancel
          </Button>
          <Button
            onClick={confirmRegenerateCard}
            color="primary"
            variant="contained"
            disabled={regenerateCard.isPending}
          >
            {regenerateCard.isPending ? 'Regenerating...' : 'Regenerate Card'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Game Confirmation Dialog */}
      <Dialog open={deleteGameDialogOpen} onClose={() => setDeleteGameDialogOpen(false)}>
        <DialogTitle>Delete Game</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              ⚠️ This action cannot be undone!
            </Typography>
            <Typography>
              This will permanently delete the game <strong>&quot;{gameData?.name}&quot;</strong> and all associated data:
            </Typography>
            <ul style={{ marginTop: 8, marginBottom: 0 }}>
              <li>All participant records and bingo cards</li>
              <li>All game items and configurations</li>
              <li>All winner records and achievements</li>
              <li>All game history and statistics</li>
            </ul>
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Players will no longer be able to access this game or their progress.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteGameDialogOpen(false)}
            disabled={deleteGame.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteGame}
            color="error"
            variant="contained"
            disabled={deleteGame.isPending}
            startIcon={deleteGame.isPending ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleteGame.isPending ? 'Deleting...' : 'Delete Game'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}


