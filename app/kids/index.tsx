import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme/colors';
import { Typography } from '@/src/theme/typography';

const QUIZ_QUESTIONS = [
  {
    id: 'q1',
    question: 'Quel est l\'arbre emblématique le plus grand du Gabon dont le bois sert pour le contreplaqué ?',
    options: ['L\'Okoumé', 'Le Baobab', 'Le Sapin'],
    correct: 0,
    explanation: 'Bravo ! L\'Okoumé (Aucoumea klaineana) pousse principalement au Gabon !'
  },
  {
    id: 'q2',
    question: 'Quelle partie de la plante absorbe l\'eau dans la terre ?',
    options: ['Les fleurs', 'Les racines', 'Les feuilles'],
    correct: 1,
    explanation: 'Excellente réponse ! Les racines boivent l\'eau sous le sol !'
  }
];

export default function KidsModeScreen() {
  const router = useRouter();
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const handleAnswer = (index: number) => {
    setSelectedOption(index);
    const isCorrect = index === QUIZ_QUESTIONS[currentQuizIndex].correct;

    if (isCorrect) {
      setScore((s) => s + 1);
    }

    Alert.alert(
      isCorrect ? 'Bravo !' : 'Oups !',
      QUIZ_QUESTIONS[currentQuizIndex].explanation,
      [
        {
          text: 'Suivant',
          onPress: () => {
            if (currentQuizIndex + 1 < QUIZ_QUESTIONS.length) {
              setCurrentQuizIndex((i) => i + 1);
              setSelectedOption(null);
            } else {
              setQuizFinished(true);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Mascot Hero Greeting */}
      <View style={styles.mascotCard}>
        <Ionicons name="leaf-outline" size={54} color={Colors.forestGreen} style={styles.mascotIcon} />
        <View style={styles.mascotBubble}>
          <Text style={styles.mascotName}>Léo le Gorille Botaniste</Text>
          <Text style={styles.mascotSpeech}>
            « Mbolo petit explorateur ! Bienvenue dans la forêt du Gabon. Découvrons ensemble les secrets des arbres ! »
          </Text>
        </View>
      </View>

      {/* Safety Guardrail Notice for Minors */}
      <View style={styles.childSafetyBanner}>
        <View style={styles.safetyNotice}>
          <Ionicons name="lock-closed-outline" size={18} color={Colors.forestGreen} />
          <Text style={styles.childSafetyText}>
            Mode Enfant : les remèdes et posologies ne sont pas accessibles ici. Demande toujours l'aide d'un adulte !
          </Text>
        </View>
      </View>

      {/* Interactive Quiz Area */}
      <Text style={styles.sectionTitle}>Le Quiz de la Forêt avec Léo</Text>

      {!quizFinished ? (
        <View style={styles.quizCard}>
          <Text style={styles.questionNumber}>Question {currentQuizIndex + 1} / {QUIZ_QUESTIONS.length}</Text>
          <Text style={styles.questionText}>{QUIZ_QUESTIONS[currentQuizIndex].question}</Text>

          {QUIZ_QUESTIONS[currentQuizIndex].options.map((option, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.optionBtn, selectedOption === idx && styles.optionBtnSelected]}
              onPress={() => handleAnswer(idx)}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.quizFinishedCard}>
          <Ionicons name="trophy-outline" size={50} color={Colors.ochre} />
          <Text style={styles.finishedTitle}>Quiz Terminé !</Text>
          <Text style={styles.finishedScore}>Ton Score : {score} / {QUIZ_QUESTIONS.length}</Text>
          <TouchableOpacity style={styles.restartBtn} onPress={() => { setQuizFinished(false); setCurrentQuizIndex(0); setScore(0); }}>
            <Text style={styles.restartBtnText}>Recommencer le Quiz</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>Récompenses</Text>
      <View style={styles.badgeGallery}>
        <Ionicons name="ribbon-outline" size={28} color={Colors.textMuted} />
        <Text style={styles.badgeTitle}>Les récompenses seront disponibles prochainement.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDE7', // Fond jaune pastel enfantin
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  mascotCard: {
    backgroundColor: Colors.sunYellow,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.forestGreen,
  },
  mascotIcon: {
    marginRight: 12,
  },
  mascotBubble: {
    flex: 1,
  },
  mascotName: {
    ...Typography.header2,
    color: Colors.forestGreen,
  },
  mascotSpeech: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.darkGray,
    marginTop: 4,
    fontWeight: '600',
  },
  childSafetyBanner: {
    backgroundColor: Colors.lightGreen,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primaryGreen,
  },
  childSafetyText: {
    ...Typography.caption,
    color: Colors.forestGreen,
    fontWeight: '700',
    textAlign: 'center',
  },
  safetyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...Typography.header2,
    color: Colors.forestGreen,
    marginBottom: 12,
  },
  quizCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.sunYellow,
  },
  questionNumber: {
    ...Typography.caption,
    color: Colors.ochre,
    fontWeight: '700',
    marginBottom: 6,
  },
  questionText: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.darkGray,
    marginBottom: 16,
  },
  optionBtn: {
    backgroundColor: Colors.naturalBeige,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  optionBtnSelected: {
    backgroundColor: Colors.sunYellow,
    borderColor: Colors.ochre,
  },
  optionText: {
    ...Typography.bodyBold,
    color: Colors.darkGray,
  },
  quizFinishedCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.sunYellow,
  },
  finishedEmoji: {
    fontSize: 50,
  },
  finishedTitle: {
    ...Typography.header1,
    color: Colors.forestGreen,
    marginTop: 8,
  },
  finishedScore: {
    ...Typography.header2,
    color: Colors.ochre,
    marginVertical: 6,
  },
  restartBtn: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  restartBtnText: {
    color: Colors.white,
    fontWeight: '700',
  },
  badgeGallery: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  badgeTitle: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.darkGray,
  },
});
