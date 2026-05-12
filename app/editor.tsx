import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { useLocalSearchParams, router } from 'expo-router';
import { auth, db } from '../src/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ArrowLeft, Cloud } from 'lucide-react-native';

export default function Editor() {
  const { id, isNew } = useLocalSearchParams();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [allNotes, setAllNotes] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  
  const saveTimeoutRef = useRef(null);
  const richTextRef = useRef(null);

  useEffect(() => {
    loadNote();
  }, []);


  const loadNote = async () => {
    if (auth.currentUser) {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.notes) {
          const notesArray = data.notes;
          setAllNotes(notesArray);
          if (!isNew) {
            const note = notesArray.find(n => n.id.toString() === id.toString());
            if (note) {
              setTitle(note.title || '');
              setContent(note.content || '');
            }
          }
        }
      }
      setIsReady(true);
    }
  };

  useEffect(() => {
    if (!isReady) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      let updatedNotes = [...allNotes];
      
      if (isNew) {
        const index = updatedNotes.findIndex(n => n.id.toString() === id.toString());
        if (index !== -1) {
          updatedNotes[index] = { ...updatedNotes[index], title, content, date: new Date().toISOString() };
        } else {
          const newNote = { id: parseInt(id), title, content, date: new Date().toISOString(), pinned: false };
          updatedNotes.unshift(newNote);
          setAllNotes(updatedNotes);
        }
      } else {
        const index = updatedNotes.findIndex(n => n.id.toString() === id.toString());
        if (index !== -1) {
          updatedNotes[index] = { ...updatedNotes[index], title, content, date: new Date().toISOString() };
        }
      }

      if (auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), { notes: updatedNotes }, { merge: true });
      }
      setSaving(false);
    }, 800); // Auto-save 800ms after user stops typing

    return () => clearTimeout(saveTimeoutRef.current);
  }, [title, content, isReady]);

  return (
    <View style={styles.wrapper}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <ArrowLeft color="#eab308" size={24} />
          </TouchableOpacity>
          
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 24, height: 24}}>
            {saving ? (
              <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: '#eab308'}} />
            ) : (
              <Cloud color="#64748b" size={20} />
            )}
          </View>
        </View>
        
        <TextInput 
          style={styles.titleInput}
          placeholder="Note Title"
          placeholderTextColor="#6b7280"
          value={title}
          onChangeText={setTitle}
        />
        
        <RichToolbar
          editor={richTextRef}
          actions={[
            actions.undo,
            actions.redo,
            actions.setBold, 
            actions.setItalic, 
            actions.setUnderline, 
            actions.insertBulletsList,
            actions.insertOrderedList
          ]}
          iconTint="#94a3b8"
          selectedIconTint="#eab308"
          style={styles.toolbar}
        />

        <View style={{flex: 1, minHeight: 300, marginTop: 12}}>
          <RichEditor
            ref={richTextRef}
            initialContentHTML={content}
            onChange={(html) => setContent(html)}
            placeholder="Start writing..."
            editorStyle={{
              backgroundColor: '#0f1115',
              color: '#e2e8f0',
              placeholderColor: '#6b7280',
              cssText: 'body { font-family: sans-serif; font-size: 18px; line-height: 1.6; }'
            }}
            useContainer={true}
            style={{flex: 1}}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0f1115' },
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  iconBtn: { padding: 8 },
  titleInput: { fontSize: 24, fontWeight: 'bold', color: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 16 },
  toolbar: { backgroundColor: '#1a1d24', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' }
});
