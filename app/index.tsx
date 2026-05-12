import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert, LayoutAnimation, Platform, UIManager, Share, Animated } from 'react-native';
import { router } from 'expo-router';
import { auth, db } from '../src/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Plus, User, Cloud, CloudOff, Search, Pin, Trash2, CheckSquare, Square, MoreVertical, LayoutList, LayoutGrid, X, RotateCcw, Trash, Share2, Palette } from 'lucide-react-native';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const NOTE_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Rose', value: '#be123c' },
  { name: 'Orange', value: '#c2410c' },
  { name: 'Amber', value: '#b45309' },
  { name: 'Emerald', value: '#047857' },
  { name: 'Blue', value: '#1d4ed8' },
  { name: 'Violet', value: '#6d28d9' },
  { name: 'Pink', value: '#a21caf' },
];

export default function Home() {
  const [notes, setNotes] = useState([]);
  const [trash, setTrash] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [isListView, setIsListView] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [colorPickerFor, setColorPickerFor] = useState(null);
  const [showColorRow, setShowColorRow] = useState(false);

  const bottomBarAnim = useRef(new Animated.Value(200)).current;

  useEffect(() => {
    let unsubscribeSnapshot;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid);
        unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.notes) setNotes(data.notes);
            if (data.trash) setTrash(data.trash);
          }
        }, (error) => console.error("Live sync error:", error));
      }
      setLoading(false);
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // Auto-purge trash older than 30 days
  useEffect(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const purged = trash.filter(t => new Date(t.deletedAt).getTime() > thirtyDaysAgo);
    if (purged.length !== trash.length) {
      setTrash(purged);
      if (user) setDoc(doc(db, 'users', user.uid), { trash: purged }, { merge: true });
    }
  }, []);

  const setNoteColor = async (id, color) => {
    const updatedNotes = notes.map(n => n.id === id ? { ...n, color } : n);
    setNotes(updatedNotes);
    setColorPickerFor(null);
    if (user) await setDoc(doc(db, 'users', user.uid), { notes: updatedNotes }, { merge: true });
  };

  const shareNote = async (note) => {
    const text = (note.title ? note.title + '\n\n' : '') + (note.content || '').replace(/<[^>]*>?/gm, '');
    try {
      await Share.share({ message: text, title: note.title || 'Kalam Note' });
    } catch (e) {
      console.error(e);
    }
  };

  const togglePinSelected = async (pinState) => {
    if(!user || selectedNotes.length === 0) return;
    const updatedNotes = notes.map(n => selectedNotes.includes(n.id) ? {...n, pinned: pinState} : n);
    setNotes(updatedNotes);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedNotes([]);
    await setDoc(doc(db, 'users', user.uid), { notes: updatedNotes }, { merge: true });
  };

  const deleteSelected = async () => {
    if(!user || selectedNotes.length === 0) return;
    Alert.alert("Delete Notes", `Move ${selectedNotes.length} note(s) to trash?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          const notesToTrash = notes.filter(n => selectedNotes.includes(n.id));
          const newTrash = [...notesToTrash.map(n => ({ ...n, deletedAt: new Date().toISOString() })), ...trash];
          const updatedNotes = notes.filter(n => !selectedNotes.includes(n.id));
          setNotes(updatedNotes);
          setTrash(newTrash);
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setSelectedNotes([]);
          await setDoc(doc(db, 'users', user.uid), { notes: updatedNotes, trash: newTrash }, { merge: true });
      }}
    ]);
  };

  const restoreFromTrash = async (id) => {
    const note = trash.find(n => n.id === id);
    if (note && user) {
      const { deletedAt, ...restoredNote } = note;
      const updatedNotes = [restoredNote, ...notes];
      const updatedTrash = trash.filter(n => n.id !== id);
      setNotes(updatedNotes);
      setTrash(updatedTrash);
      await setDoc(doc(db, 'users', user.uid), { notes: updatedNotes, trash: updatedTrash }, { merge: true });
    }
  };

  const permanentDelete = async (id) => {
    if (user) {
      const updatedTrash = trash.filter(n => n.id !== id);
      setTrash(updatedTrash);
      await setDoc(doc(db, 'users', user.uid), { trash: updatedTrash }, { merge: true });
    }
  };

  const emptyTrashAll = async () => {
    if (user) {
      setTrash([]);
      await setDoc(doc(db, 'users', user.uid), { trash: [] }, { merge: true });
    }
  };

  const handleLongPress = (id) => {
    if (selectedNotes.length === 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSelectedNotes([id]);
      // Animate bottom bar sliding up
      bottomBarAnim.setValue(200);
      Animated.spring(bottomBarAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    }
  };

  const handlePress = (id) => {
    if (selectedNotes.length > 0) {
      if (selectedNotes.includes(id)) {
        const newSelection = selectedNotes.filter(nid => nid !== id);
        if (newSelection.length === 0) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedNotes(newSelection);
      } else {
        setSelectedNotes([...selectedNotes, id]);
      }
    } else {
      router.push({ pathname: '/editor', params: { id } });
    }
  };

  const createNewNote = () => {
    const newNote = {
      id: Date.now(),
      title: '',
      content: '',
      date: new Date().toISOString(),
      pinned: false,
      color: ''
    };
    router.push({ pathname: '/editor', params: { id: newNote.id, isNew: 'true' } });
  };

  const filteredNotes = notes.filter(n => 
    (n.title?.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (n.content?.toLowerCase().includes(searchQuery.toLowerCase()))
  ).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.date) - new Date(a.date);
  });

  const getDaysLeft = (deletedAt) => {
    const days = Math.ceil((30 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(deletedAt).getTime())) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const renderNote = ({ item }) => {
    const isSelected = selectedNotes.includes(item.id);
    const selectionMode = selectedNotes.length > 0;
    
    return (
      <TouchableOpacity 
        style={[
          styles.card, 
          isListView && {width: '100%'}, 
          item.pinned && styles.pinnedCard, 
          isSelected && {borderColor: '#eab308', backgroundColor: 'rgba(234, 179, 8, 0.1)'},
          item.color ? { borderColor: item.color + '44', backgroundColor: item.color + '11' } : null
        ]} 
        onPress={() => handlePress(item.id)}
        onLongPress={() => handleLongPress(item.id)}
        activeOpacity={0.8}
      >
        {item.color ? <View style={{position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: item.color, borderTopLeftRadius: 16, borderTopRightRadius: 16}} /> : null}
        {selectionMode && (
          <View style={{position: 'absolute', top: 12, right: 12, zIndex: 10}}>
            {isSelected ? <CheckSquare color="#eab308" size={20} /> : <Square color="#64748b" size={20} />}
          </View>
        )}
        <Text style={[styles.title, selectionMode && {paddingRight: 24}]} numberOfLines={2}>{item.title || 'Untitled Note'}</Text>
        <Text style={styles.preview} numberOfLines={4}>
          {item.content ? item.content.replace(/<[^>]*>?/gm, '') : ''}
        </Text>
        
        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 'auto', paddingTop: 12}}>
          <Pin color={item.pinned ? '#eab308' : '#64748b'} size={14} style={{marginRight: 6}} />
          <Text style={styles.date}>{new Date(item.date).toLocaleDateString('en-GB')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTrashNote = ({ item }) => (
    <View style={[styles.card, {width: '100%'}, item.color ? { borderColor: item.color + '44', backgroundColor: item.color + '11' } : null]}>
      <Text style={styles.title} numberOfLines={2}>{item.title || 'Untitled Note'}</Text>
      <Text style={styles.preview} numberOfLines={3}>
        {item.content ? item.content.replace(/<[^>]*>?/gm, '') : ''}
      </Text>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 12}}>
        <Text style={{color: '#ef4444', fontSize: 12}}>Auto-deletes in {getDaysLeft(item.deletedAt)} days</Text>
        <View style={{flexDirection: 'row', gap: 16}}>
          <TouchableOpacity onPress={() => restoreFromTrash(item.id)}>
            <RotateCcw color="#22c55e" size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert("Delete Forever", "This cannot be undone.", [
            {text: "Cancel", style: "cancel"},
            {text: "Delete", style: "destructive", onPress: () => permanentDelete(item.id)}
          ])}>
            <Trash2 color="#ef4444" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  // Trash View
  if (showTrash) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, {alignItems: 'center'}]}>
          <TouchableOpacity onPress={() => setShowTrash(false)} style={{flexDirection: 'row', alignItems: 'center'}}>
            <X color="#eab308" size={20} style={{marginRight: 8}} />
            <Text style={{color: '#e2e8f0', fontSize: 18, fontWeight: 'bold'}}>Recently Deleted</Text>
          </TouchableOpacity>
          {trash.length > 0 && (
            <TouchableOpacity onPress={() => Alert.alert("Empty Trash", "Permanently delete all?", [
              {text: "Cancel", style: "cancel"},
              {text: "Empty", style: "destructive", onPress: emptyTrashAll}
            ])}>
              <Text style={{color: '#ef4444', fontWeight: '600'}}>Empty All</Text>
            </TouchableOpacity>
          )}
        </View>
        <FlatList 
          data={trash}
          renderItem={renderTrashNote}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{alignItems: 'center', marginTop: 60}}>
              <Trash color="#64748b" size={48} style={{opacity: 0.3, marginBottom: 16}} />
              <Text style={styles.empty}>Trash is empty</Text>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.container} activeOpacity={1} onPress={() => { setShowMenu(false); setColorPickerFor(null); }}>
      {selectedNotes.length > 0 ? (
        <View style={[styles.header, {backgroundColor: '#1a1d24', alignItems: 'center'}]}>
          <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSelectedNotes([]); }}>
            <Text style={{color: '#eab308', fontSize: 16}}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{color: '#fff', fontSize: 20, fontWeight: 'bold'}}>{selectedNotes.length} selected</Text>
          <TouchableOpacity onPress={() => setSelectedNotes(filteredNotes.map(n => n.id))}>
            <Text style={{color: '#eab308', fontSize: 16}}>Select all</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.header}>
          <View style={styles.status}>
            {user ? <Cloud color="#3b82f6" size={20} style={{marginRight: 8}} /> : <CloudOff color="#94a3b8" size={20} style={{marginRight: 8}} />}
            <Text style={{color: user ? '#3b82f6' : '#94a3b8', fontWeight: 'bold', fontSize: 16}}>
              {user ? 'Synced' : 'Local'}
            </Text>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 16}}>
            <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={{padding: 4}}>
              <MoreVertical color="#e2e8f0" size={24} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showMenu && selectedNotes.length === 0 && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setIsListView(!isListView); setShowMenu(false); }}>
            {isListView ? <LayoutGrid color="#e2e8f0" size={20} /> : <LayoutList color="#e2e8f0" size={20} />}
            <Text style={styles.menuText}>{isListView ? 'Grid view' : 'List view'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setShowTrash(true); setShowMenu(false); }}>
            <Trash color="#e2e8f0" size={20} />
            <Text style={styles.menuText}>Recently Deleted</Text>
            {trash.length > 0 && (
              <View style={{marginLeft: 'auto', backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2}}>
                <Text style={{color: '#fff', fontSize: 12, fontWeight: 'bold'}}>{trash.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => {
            setShowMenu(false);
            if(user) {
              Alert.alert("Sign Out", "Are you sure?", [
                {text: "Cancel", style: "cancel"}, 
                {text: "Sign Out", onPress: () => auth.signOut()}
              ]);
            } else {
              router.push('/login');
            }
          }}>
            <User color={user ? '#eab308' : '#e2e8f0'} size={20} />
            <Text style={[styles.menuText, {color: user ? '#eab308' : '#e2e8f0'}]}>{user ? 'Sign Out' : 'Sign In'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.searchContainer}>
        <Search color="#64748b" size={20} />
        <TextInput 
           style={styles.searchInput}
           placeholder="Search notes..."
           placeholderTextColor="#64748b"
           value={searchQuery}
           onChangeText={setSearchQuery}
        />
      </View>

      <FlatList 
        key={isListView ? 'list' : 'grid'}
        data={filteredNotes}
        renderItem={renderNote}
        keyExtractor={item => item.id.toString()}
        numColumns={isListView ? 1 : 2}
        columnWrapperStyle={!isListView ? styles.row : undefined}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No notes yet. Create one!</Text>}
      />

      {selectedNotes.length > 0 && (
        <Animated.View style={[styles.bottomBar, { transform: [{ translateY: bottomBarAnim }] }]}>
          {showColorRow ? (
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, flex: 1, paddingHorizontal: 16}}>
              {NOTE_COLORS.map(c => (
                <TouchableOpacity 
                  key={c.name}
                  onPress={async () => {
                    const updatedNotes = notes.map(n => selectedNotes.includes(n.id) ? { ...n, color: c.value } : n);
                    setNotes(updatedNotes);
                    setShowColorRow(false);
                    if (user) await setDoc(doc(db, 'users', user.uid), { notes: updatedNotes }, { merge: true });
                  }}
                  style={[styles.colorDot, { backgroundColor: c.value || '#1a1d24', borderColor: 'rgba(255,255,255,0.15)' }]}
                />
              ))}
              <TouchableOpacity onPress={() => setShowColorRow(false)} style={{marginLeft: 8}}>
                <X color="#94a3b8" size={20} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.bottomAction} onPress={() => togglePinSelected(true)}>
                <Pin color="#e2e8f0" size={20} />
                <Text style={styles.bottomActionText}>Pin</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bottomAction} onPress={() => togglePinSelected(false)}>
                <X color="#94a3b8" size={20} />
                <Text style={styles.bottomActionText}>Unpin</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bottomAction} onPress={() => setShowColorRow(true)}>
                <Palette color="#eab308" size={20} />
                <Text style={[styles.bottomActionText, {color: '#eab308'}]}>Color</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bottomAction} onPress={() => {
                if (selectedNotes.length === 1) {
                  const note = notes.find(n => n.id === selectedNotes[0]);
                  if (note) shareNote(note);
                } else {
                  Alert.alert('Share', 'Please select only one note to share.');
                }
              }}>
                <Share2 color="#3b82f6" size={20} />
                <Text style={[styles.bottomActionText, {color: '#3b82f6'}]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bottomAction} onPress={deleteSelected}>
                <Trash2 color="#ef4444" size={20} />
                <Text style={[styles.bottomActionText, {color: '#ef4444'}]}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      )}

      {selectedNotes.length === 0 && (
        <TouchableOpacity style={styles.fab} onPress={createNewNote}>
          <Plus color="#000" size={32} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)', zIndex: 1 },
  menuOverlay: { position: 'absolute', top: 60, right: 16, backgroundColor: '#1a1d24', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', zIndex: 100, elevation: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  menuText: { color: '#e2e8f0', fontSize: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1d24', margin: 16, marginBottom: 0, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  searchInput: { flex: 1, color: '#e2e8f0', fontSize: 16, marginLeft: 12 },
  status: { flexDirection: 'row', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  card: { backgroundColor: '#1a1d24', padding: 16, borderRadius: 16, width: '48%', minHeight: 140, maxHeight: 260, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', marginBottom: 12, overflow: 'hidden' },
  pinnedCard: { borderColor: 'rgba(234, 179, 8, 0.3)', backgroundColor: 'rgba(234, 179, 8, 0.05)' },
  title: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold', marginBottom: 8, lineHeight: 22 },
  date: { color: '#64748b', fontSize: 12, fontWeight: '500' },
  preview: { color: '#94a3b8', fontSize: 13, lineHeight: 18 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 40 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1a1d24', flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingBottom: 32 },
  bottomAction: { alignItems: 'center', gap: 4 },
  bottomActionText: { color: '#e2e8f0', fontSize: 12, fontWeight: '500' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: '#eab308', justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#eab308', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  colorPicker: { flexDirection: 'row', gap: 8, paddingTop: 12, paddingBottom: 4, flexWrap: 'wrap' },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 }
});
