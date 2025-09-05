"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Snackbar,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { Delete as DeleteIcon, Edit as EditIcon, Check as CheckIcon, Close as CloseIcon } from "@mui/icons-material";

export default function CreateSessionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPublic: true,
    startAt: new Date(),
    endAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
  });
  const [items, setItems] = useState<Array<{ label: string }>>([]);
  const [newItem, setNewItem] = useState({ label: "" });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<{ label: string }>({ label: "" });
  const [centerSquare, setCenterSquare] = useState({ label: "" });
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const createGame = api.bingoGame.create.useMutation({
    onSuccess: (created) => {
      setToast({ open: true, message: 'Game created successfully!', severity: 'success' });
      setTimeout(() => router.push(`/admin/games/${created.id}`), 1000);
    },
    onError: (error) => {
      setToast({ open: true, message: `Failed to create game: ${error.message}`, severity: 'error' });
    },
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [status, session, router]);

  const handleAddItem = () => {
    if (!newItem.label.trim()) return;
    if (items.length >= 24) {
      setToast({ open: true, message: 'Maximum 24 items allowed per game', severity: 'error' });
      return;
    }
    setItems((prev) => [...prev, { label: newItem.label.trim() }]);
    setNewItem({ label: "" });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };
  const handleStartEdit = (index: number) => {
    const current = items[index];
    if (!current) return;
    setEditingIndex(index);
    setEditingDraft({ label: current.label });
  };
  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    setItems((prev) => prev.map((it, i) => i === editingIndex ? { label: editingDraft.label.trim() } : it));
    setEditingIndex(null);
    setEditingDraft({ label: "" });
  };
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingDraft({ label: "" });
  };

  const handleCloseToast = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleCreate = () => {
    createGame.mutate({
      ...formData,
      items: items.length > 0 ? items : undefined,
      centerSquare: centerSquare.label.trim() ? { label: centerSquare.label.trim() } : undefined,
    });
  };

  if (status === "loading") return null;
  if (!session?.user || session.user.role !== "ADMIN") return null;

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
        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: 'white' }}>
            Create Session
          </Typography>

          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
            <Box sx={{ flex: '0 0 33.333%', minWidth: 0 }}>
              <Paper sx={{ p: 2, height: 'fit-content' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Session Details
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    label="Session Name"
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
                    control={<Switch checked={formData.isPublic} onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })} />}
                    label="Public Session"
                  />
                  <DateTimePicker
                    label="Start Time"
                    value={formData.startAt}
                    onChange={(d) => d && setFormData({ ...formData, startAt: d })}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: {
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            '& fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.3)',
                            },
                            '&:hover fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.5)',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.7)',
                            },
                          },
                        }
                      }
                    }}
                  />
                  <DateTimePicker
                    label="End Time"
                    value={formData.endAt}
                    onChange={(d) => d && setFormData({ ...formData, endAt: d })}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: {
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            '& fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.3)',
                            },
                            '&:hover fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.5)',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.7)',
                            },
                          },
                        }
                      }
                    }}
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

                  {createGame.error && (
                    <Alert severity="error">{createGame.error.message}</Alert>
                  )}

                  <Button variant="contained" onClick={handleCreate} disabled={createGame.isPending}>
                    {createGame.isPending ? "Creating..." : "Create Game"}
                  </Button>
                </Box>
              </Paper>
            </Box>

            <Box sx={{ flex: '0 0 66.666%', minWidth: 0 }}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 'fit-content', minHeight: '100vh' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Game Items ({items.length})
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
                      sx={{
                        flexGrow: 1,
                        minWidth: 0,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(10px)',
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.7)',
                          },
                        },
                      }}
                      size="small"
                    />
                    <Button
                      variant="contained"
                      onClick={handleAddItem}
                      disabled={!newItem.label.trim()}
                      sx={{ minWidth: 100 }}
                      size="small"
                    >
                      Add
                    </Button>
                  </Box>
                </Paper>

                {/* Items Table Section */}
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Current Items
                </Typography>

                <TableContainer component={Paper} sx={{ flex: 1, minHeight: 0 }}>
                  <Table stickyHeader size="small" aria-label="bingo items table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item Label</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="body1" color="text.secondary">
                              No items added yet. Add some bingo items above to get started!
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item, idx) => (
                          <TableRow key={`${item.label}-${idx}`} hover>
                            <TableCell component="th" scope="row">
                              {editingIndex === idx ? (
                                <TextField size="small" value={editingDraft.label} onChange={(e) => setEditingDraft({ ...editingDraft, label: e.target.value })} fullWidth />
                              ) : (
                                <Typography variant="body2" fontWeight={600}>{item.label}</Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              {editingIndex === idx ? (
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                  <Tooltip title="Save"><IconButton size="small" color="primary" onClick={handleSaveEdit} aria-label={`save item ${editingDraft.label}`}><CheckIcon fontSize="small" /></IconButton></Tooltip>
                                  <Tooltip title="Cancel"><IconButton size="small" onClick={handleCancelEdit} aria-label={`cancel edit ${item.label}`}><CloseIcon fontSize="small" /></IconButton></Tooltip>
                                </Box>
                              ) : (
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                  <Tooltip title="Edit item"><IconButton size="small" onClick={() => handleStartEdit(idx)} aria-label={`edit item ${item.label}`}><EditIcon fontSize="small" /></IconButton></Tooltip>
                                  <Tooltip title="Remove item"><IconButton size="small" color="error" onClick={() => handleRemoveItem(idx)} aria-label={`remove item ${item.label}`}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                                </Box>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          </Box>
        </Container>

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


