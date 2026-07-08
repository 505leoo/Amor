import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { getFirestore } from 'firebase/firestore';

// Componente de teclado simple
const SimpleKeyboard = ({ onKeyPress }) => {
	const letters = ['q','w','e','r','t','y','u','i','o','p','a','s','d','f','g','h','j','k','l','z','x','c','v','b','n','m'];
	const numbers = ['1','2','3','4','5','6','7','8','9','0'];
	
	return (
		<View style={styles.keyboard}>
			<View style={styles.keyRow}>
				{numbers.map(key => (
					<TouchableOpacity key={key} style={styles.key} onPress={() => onKeyPress(key)}>
						<Text style={styles.keyText}>{key}</Text>
					</TouchableOpacity>
				))}
			</View>
			<View style={styles.keyRow}>
				{letters.slice(0,10).map(key => (
					<TouchableOpacity key={key} style={styles.key} onPress={() => onKeyPress(key)}>
						<Text style={styles.keyText}>{key}</Text>
					</TouchableOpacity>
				))}
			</View>
			<View style={styles.keyRow}>
				{letters.slice(10,19).map(key => (
					<TouchableOpacity key={key} style={styles.key} onPress={() => onKeyPress(key)}>
						<Text style={styles.keyText}>{key}</Text>
					</TouchableOpacity>
				))}
			</View>
			<View style={styles.keyRow}>
				{letters.slice(19).map(key => (
					<TouchableOpacity key={key} style={styles.key} onPress={() => onKeyPress(key)}>
						<Text style={styles.keyText}>{key}</Text>
					</TouchableOpacity>
				))}
				<TouchableOpacity style={[styles.key, styles.deleteKey]} onPress={() => onKeyPress('DELETE')}>
					<Text style={styles.keyText}>⌫</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default function Login({ navigation }) {
	const navigateToScreen = navigation?.navigate || (() => {});
	const [step, setStep] = useState(1);
	const [emailPrefix, setEmailPrefix] = useState('');
	const [password, setPassword] = useState('');
	const [emailError, setEmailError] = useState('');
	const [passwordError, setPasswordError] = useState('');
	const [showPassword, setShowPassword] = useState(true);
	const [showKeyboard, setShowKeyboard] = useState(true);

	const validateEmailPrefix = (prefix) => {
		const p = String(prefix).trim();
		if (!p) return 'Por favor ingresa tu correo.';
		if (p.length < 4) return 'El correo debe tener al menos 4 caracteres.';
		return '';
	};

	const handleKeyPress = (key) => {
		if (key === 'DELETE') {
			if (step === 1) {
				setEmailPrefix(prev => prev.slice(0, -1));
			} else {
				setPassword(prev => prev.slice(0, -1));
			}
		} else {
			if (step === 1) {
				setEmailPrefix(prev => prev + key);
			} else {
				setPassword(prev => prev + key);
			}
		}
	};

	const handleNextStep = () => {
		const error = validateEmailPrefix(emailPrefix);
		if (error) {
			setEmailError(error);
			return;
		}
		setEmailError('');
		setStep(2);
	};

	const handleLogin = async () => {
		const trimmedPassword = password.trim();
		if (!trimmedPassword) {
			setPasswordError('Por favor ingresa tu contraseña.');
			return;
		}
		const email = `${emailPrefix.trim()}@gmail.com`;
		try {
			await signInWithEmailAndPassword(auth, email, trimmedPassword);

			// Verificar conexión con Firestore
			const firestore = getFirestore();
			

			// Navegar a intro después del login exitoso
			setTimeout(() => {
				if (navigation && navigation.navigate) {
					navigation.navigate('intro');
				}
			}, 500);
		} catch (error) {
			console.error('Error during login or Firestore connection:', error);
			setPasswordError('Correo o contraseña incorrectos o problema de conexión.');
		}
	};

	return (
		<View style={styles.backgroundImage}>
			<StatusBar hidden={true} />
			<View style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity onPress={() => step === 1 ? navigateToScreen('register') : setStep(1)} style={styles.registerButton}>
						<Text style={styles.registerText}>Registrarse</Text>
					</TouchableOpacity>
					{step === 1 && (
						<TouchableOpacity 
							onPress={handleNextStep} 
							style={[styles.continueButton, emailPrefix.length >= 4 && styles.continueButtonActive]}
						>
							<Text style={[styles.continueText, emailPrefix.length >= 4 && styles.continueTextActive]}>Continuar</Text>
						</TouchableOpacity>
					)}
					{step === 2 && (
						<TouchableOpacity 
							onPress={handleLogin} 
							style={[styles.continueButton, password.length > 0 && styles.continueButtonActive]}
						>
							<Text style={[styles.continueText, password.length > 0 && styles.continueTextActive]}>Entrar</Text>
						</TouchableOpacity>
					)}
				</View>

				{step === 1 && (
					<View style={styles.stepContainer}>
						<Text style={styles.title}>¿Cuál es tu correo?</Text>
						<Text style={styles.description}>Ingresa el correo con el que te registraste.</Text>
						<TouchableOpacity 
							style={[styles.emailContainer]} 
						>
							<Text style={styles.emailPrefix}>{emailPrefix}</Text>
							<Text style={styles.emailSuffix}>@gmail.com</Text>
						</TouchableOpacity>
						{emailError ? (
							<View style={styles.errorContainer}>
								<Text style={styles.errorText}>✖ {emailError}</Text>
							</View>
						) : null}
						<SimpleKeyboard onKeyPress={handleKeyPress} />
					</View>
				)}

				{step === 2 && (
					<View style={styles.stepContainer}>
						<Text style={styles.title}>Ingresa tu contraseña</Text>
						<Text style={styles.description}>Escribe la contraseña de tu cuenta.</Text>
						<TouchableOpacity 
							style={[styles.passwordRow]} 
						>
							<Text style={styles.passwordDisplay}>{showPassword ? password : '•'.repeat(password.length)}</Text>
							<TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
								<Icon name={showPassword ? 'visibility' : 'visibility-off'} size={22} color={showPassword ? '#007bff' : '#888'} />
							</TouchableOpacity>
						</TouchableOpacity>
						{passwordError ? (
							<View style={styles.errorContainer}>
								<Text style={styles.errorText}>✖ {passwordError}</Text>
							</View>
						) : null}
						<SimpleKeyboard onKeyPress={handleKeyPress} />
					</View>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	backgroundImage: {
		flex: 1,
		backgroundColor: '#fff',
	},
	container: {
		flex: 1,
		justifyContent: 'flex-start',
		alignItems: 'center',
		paddingVertical: 5,
	},
	header: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 25,
		paddingVertical: 2,
		marginBottom: 5,
	},
	registerButton: {
		backgroundColor: '#f0f0f0',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 15,
		borderWidth: 1,
		borderColor: '#e0e0e0',
	},
	registerText: {
		color: '#666',
		fontSize: 13,
		fontWeight: '500',
	},
	continueButton: {
		backgroundColor: '#ddd',
		paddingHorizontal: 15,
		paddingVertical: 8,
		borderRadius: 20,
		marginTop: 15,
	},
	continueButtonActive: {
		backgroundColor: '#96c7fc',
	},
	continueText: {
		color: '#888',
		fontSize: 14,
		fontWeight: '600',
	},
	continueTextActive: {
		color: '#fff',
	},
	stepContainer: {
		width: '100%',
		alignItems: 'center',
		marginTop: -17,
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 0,
		textAlign: 'center',
		color: '#333',
		paddingVertical: -15,
	},
	description: {
		fontSize: 13,
		color: '#666',
		textAlign: 'center',
		marginBottom: 5,
		paddingHorizontal: 18,
		lineHeight: 16,
		paddingVertical: -5,
	},
	emailContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '80%',
		backgroundColor: '#f8f8f8',
		marginBottom: 2,
		paddingHorizontal: 6,
		paddingVertical: 1,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#eee',
	},
	emailContainerFocused: {
		borderColor: '#007bff',
		backgroundColor: '#fff',
	},
	emailPrefix: {
		flex: 1,
		padding: 8,
		fontSize: 16,
	},
	emailSuffix: {
		padding: 8,
		color: '#666',
		fontSize: 16,
	},
	passwordRow: {
		width: '80%',
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 2,
		backgroundColor: '#f8f8f8',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#eee',
	},
	passwordRowFocused: {
		borderColor: '#007bff',
		backgroundColor: '#fff',
	},
	passwordDisplay: {
		flex: 1,
		padding: 10,
		fontSize: 16,
	},
	eyeButton: {
		marginLeft: 8,
		padding: 8,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	errorContainer: {
		width: '80%',
		backgroundColor: '#fff0f0',
		borderColor: '#ff4d4d',
		borderWidth: 1,
		borderRadius: 8,
		paddingVertical: 6,
		paddingHorizontal: 8,
		marginTop: 6,
		marginBottom: 4,
	},
	errorText: {
		color: '#b00020',
		fontSize: 13,
		fontWeight: '600',
	},

	keyboard: {
		width: '100%',
		marginTop: 3,
		paddingHorizontal: 10,
	},
	keyRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginBottom: 3,
	},
	key: {
		backgroundColor: '#f0f0f0',
		padding: 8,
		margin: 2,
		borderRadius: 4,
		minWidth: 28,
		alignItems: 'center',
	},
	keyText: {
		fontSize: 14,
		color: '#333',
	},
	deleteKey: {
		backgroundColor: '#ff6b6b',
	},
	deleteKey: {
		backgroundColor: '#ff6b6b',
	},
});

