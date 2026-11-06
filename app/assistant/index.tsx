import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme/colors';
import { Typography } from '@/src/theme/typography';
import { askMamanMaboundza, ChatMessage, MEDICAL_DISCLAIMER_TEXT } from '@/src/services/aiAssistant';

export default function AssistantScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'maman_maboundza',
      text: 'Mbolo ! Je suis Maman MABOUNDZA. Pose-moi une question sur les plantes du Gabon ou leurs noms en langues locales.',
      timestamp: new Date().toISOString(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: inputText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    const botMsg = await askMamanMaboundza(userMsg.text);
    setIsTyping(false);
    setMessages((prev) => [...prev, botMsg]);
  };

  const handleVoiceInput = () => {
    Alert.alert('Saisie vocale', 'La saisie vocale n’est pas encore disponible.');
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.msgWrapper, isUser ? styles.msgWrapperUser : styles.msgWrapperBot]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Ionicons name="leaf-outline" size={20} color={Colors.forestGreen} />
          </View>
        )}

        <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleBot, item.warning && styles.msgBubbleWarning]}>
          <Text style={[styles.msgText, isUser && styles.msgTextUser]}>{item.text}</Text>

          {item.referencedPlantId && (
            <TouchableOpacity
              style={styles.plantLinkBtn}
              onPress={() => router.push(`/plant/${item.referencedPlantId}` as any)}
            >
              <Text style={styles.plantLinkText}>Consulter la fiche botanique</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Top Disclaimer Header */}
      <View style={styles.topBanner}>
        <Text style={styles.topBannerText}>
          Les réponses s’appuient sur les fiches botaniques disponibles et ne remplacent pas un avis médical.
        </Text>
      </View>

      {/* Messages Stream */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messagesContainer}
      />

      {isTyping && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>Maman MABOUNDZA recherche dans les fiches botaniques...</Text>
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.micBtn} onPress={handleVoiceInput}>
          <Ionicons name="mic-outline" size={20} color={Colors.forestGreen} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Posez votre question à Maman MABOUNDZA..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
        />

        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendText}>Envoyer</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.naturalBeige,
  },
  topBanner: {
    backgroundColor: Colors.lightGreen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  topBannerText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.forestGreen,
    textAlign: 'center',
    fontWeight: '600',
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  msgWrapper: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  msgWrapperUser: {
    justifyContent: 'flex-end',
  },
  msgWrapperBot: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.sunYellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  msgBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    padding: 14,
  },
  msgBubbleUser: {
    backgroundColor: Colors.primaryGreen,
    borderBottomRightRadius: 2,
  },
  msgBubbleBot: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  msgBubbleWarning: {
    borderColor: Colors.safetyRed,
    backgroundColor: '#FFF5F5',
  },
  msgText: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.darkGray,
    lineHeight: 20,
  },
  msgTextUser: {
    color: Colors.white,
  },
  plantLinkBtn: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  plantLinkText: {
    ...Typography.caption,
    color: Colors.primaryGreen,
    fontWeight: '700',
  },
  typingIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  typingText: {
    ...Typography.caption,
    fontStyle: 'italic',
    color: Colors.primaryGreen,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 8,
  },
  micBtn: {
    padding: 8,
  },
  micEmoji: {
    fontSize: 22,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.naturalBeige,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: Colors.forestGreen,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
