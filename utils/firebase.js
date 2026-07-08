import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  serverTimestamp, 
  setDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../firebaseConfig';

const storage = getStorage();

export const getUserData = async (userId) => {
  try {
    
    const userRef = doc(db, 'usuarios', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      return {
        ...userData,
        userId,
        nombre: userData.nombre
      };
    }

    // Si el usuario no existe, retornar null
    
    return null;
  } catch (error) {
    console.error('Error al obtener/crear usuario:', error);
    throw error;
  }
};

export const selectAndCropImage = async () => {
  try {
    // Pedir permisos primero
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Se necesita permiso para acceder a la galería');
    }

    // Usamos la configuración global del ImagePicker
    const result = await ImagePicker.launchImageLibraryAsync();
    
    if (!result.canceled) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Error al seleccionar imagen:', error);
    throw error;
  }
};

export const uploadImageToFirebase = async (uri) => {
  try {
    

    // Convertir a blob directamente desde la URI original
    const response = await fetch(uri);
    const blob = await response.blob();
    

    // Crear nombre de archivo único
    const timestamp = Date.now();
    const extension = uri.split('.').pop() || 'jpg';
    const imageName = `post_${timestamp}.${extension}`;
    
    
    // Crear referencia en Firebase Storage
    const storageRef = ref(storage, `posts/${imageName}`);
    
    
    // Iniciar subida
    const uploadTask = uploadBytesResumable(storageRef, blob);
    
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Limitar el progreso a máximo 100%
          const progress = Math.min(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
            100
          );
          // Redondear a dos decimales para evitar demasiados logs
          const roundedProgress = Math.round(progress * 100) / 100;
          
          // Solo logear cambios significativos (cada 10%)
          if (roundedProgress % 10 === 0 || roundedProgress === 100) {
            
          }
        },
        (error) => {
          console.error('Error durante la subida:', error);
          reject(error);
        },
        async () => {
          try {
            
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            
            // No verificamos la URL aquí ya que acabamos de subirla
            resolve(downloadURL);
          } catch (error) {
            console.error('Error al obtener URL:', error);
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    throw error;
  }
};

export const savePost = async (post, userId) => {
  try {
    // Obtener datos del usuario
    const userData = await getUserData(userId);
    if (!userData) {
      throw new Error('Usuario no encontrado');
    }

    
    
    // Verificar que tenemos los datos necesarios
    
    if (!userData) {
      console.error('Datos de usuario no encontrados');
      throw new Error('Datos de usuario no disponibles');
    }

    // Crear el nuevo post con userId y verificación de datos
    const newPost = {
      userId, // ID del usuario que creó el post
      authorName: userData.nombre, // Guardamos el nombre directamente en el post
      text: post.text || '',
      image: post.image || null,
      gradient: post.gradient || null,
      createdAt: serverTimestamp(),
      likes: [],
      comments: [],
      likeCount: 0,
      commentCount: 0
    };
    
    
    
    

    // Guardar en la colección 'posts'
    const postsRef = collection(db, 'posts');
    const docRef = await addDoc(postsRef, newPost);
    
    
    
    return {
      id: docRef.id,
      ...newPost,
      createdAt: new Date().toISOString() // Convertir timestamp a string para la UI
    };

  } catch (error) {
    console.error('Error al guardar post:', error);
    throw error;
  }
};

export const fetchPosts = async (userId, page = null, postsPerPage = null) => {
  try {
    // Crear query para obtener posts ordenados por fecha
    const postsRef = collection(db, 'posts');
    // If explicit pagination parameters are provided (both non-null), apply a limit
    // Otherwise fetch all posts (client will handle pagination)
    let q;
    if (page && postsPerPage) {
      // Defensive: ensure numeric
      const p = Number(page) || 1;
      const per = Number(postsPerPage) || 10;
      q = query(postsRef, orderBy('createdAt', 'desc'), limit(p * per));
    } else {
      q = query(postsRef, orderBy('createdAt', 'desc'));
    }

    // Obtener los posts
    const querySnapshot = await getDocs(q);
    const posts = [];
    
    // Procesar cada post
    for (const doc of querySnapshot.docs) {
      try {
        const post = doc.data();
        
        if (!post.userId) {
          console.error('Post sin userId:', doc.id);
          continue;
        }
        
        // Obtener datos del autor
        const authorData = await getUserData(post.userId);
        
        // Construir el post con datos verificados
        posts.push({
          id: doc.id,
          ...post,
          authorName: authorData?.nombre || 'Usuario',
          authorPhoto: authorData?.photoURL || null,
          createdAt: post.createdAt?.toDate().toISOString() || new Date().toISOString(),
          updatedAt: post.updatedAt?.toDate ? post.updatedAt?.toDate().toISOString() : (post.updatedAt || null),
          isLiked: post.likes?.includes(userId) || false,
          likeCount: post.likes?.length || 0,
          commentCount: post.comments?.length || 0
        });

      } catch (postError) {
        console.error('Error procesando post:', doc.id, postError);
        // Continuar con el siguiente post si hay error
      }
    }

    return posts;

  } catch (error) {
    console.error('Error al obtener posts:', error);
    throw error;
  }
};

export const updatePostLike = async (userId, postId, isLiked) => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      throw new Error('Post no encontrado');
    }

    const post = postDoc.data();
    const likes = post.likes || [];
    
    if (isLiked && !likes.includes(userId)) {
      // Agregar like
      await updateDoc(postRef, {
        likes: arrayUnion(userId),
        likeCount: (post.likeCount || 0) + 1
      });
    } else if (!isLiked && likes.includes(userId)) {
      // Quitar like
      await updateDoc(postRef, {
        likes: likes.filter(id => id !== userId),
        likeCount: Math.max((post.likeCount || 0) - 1, 0)
      });
    }

  } catch (error) {
    console.error('Error al actualizar like:', error);
    throw error;
  }
}

export const deletePost = async (postId) => {
    try {
        // Primero obtenemos el post para ver si tiene imagen
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);
        
        if (!postSnap.exists()) {
            throw new Error('El post no existe');
        }

        const postData = postSnap.data();

        // Si el post tiene una imagen, la eliminamos primero
        if (postData.image) {
            try {
                // Extraer el path de la URL de la imagen
                const imageUrl = new URL(postData.image);
                const imagePath = decodeURIComponent(imageUrl.pathname.split('/o/')[1].split('?')[0]);
                
                // Crear referencia al archivo y eliminarlo
                const imageRef = ref(storage, imagePath);
                await deleteObject(imageRef);
                
            } catch (error) {
                console.error('Error al eliminar la imagen:', error);
                // Continuamos con la eliminación del post incluso si falla la eliminación de la imagen
            }
        }

        // Eliminamos el post de Firestore
        await deleteDoc(postRef);

    } catch (error) {
        console.error('Error al eliminar el post:', error);
        throw error;
    }
};

export const updatePost = async (postId, { text, newImageUri = undefined, oldImageUrl = undefined, gradient = undefined }) => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      throw new Error('El post no existe');
    }

    const updates = {};

    // Handle image updates: if newImageUri is provided and different, upload it
    if (typeof newImageUri !== 'undefined') {
      // newImageUri === null means user removed the image
      if (newImageUri === null) {
        // delete old image if any
        if (oldImageUrl) {
          try {
            const imageUrl = new URL(oldImageUrl);
            const imagePath = decodeURIComponent(imageUrl.pathname.split('/o/')[1].split('?')[0]);
            const imageRef = ref(storage, imagePath);
            await deleteObject(imageRef);
          } catch (err) {
            console.error('Error al eliminar imagen antigua durante updatePost:', err);
          }
        }

        updates.image = null;
      } else {
        // If newImageUri is a local file (likely not starting with http), upload it
        if (!newImageUri.startsWith('http')) {
          const downloadURL = await uploadImageToFirebase(newImageUri);

          // delete old image if exists and different
          if (oldImageUrl) {
            try {
              const imageUrl = new URL(oldImageUrl);
              const imagePath = decodeURIComponent(imageUrl.pathname.split('/o/')[1].split('?')[0]);
              const imageRef = ref(storage, imagePath);
              await deleteObject(imageRef);
            } catch (err) {
              console.error('Error al eliminar imagen antigua durante updatePost:', err);
            }
          }

          updates.image = downloadURL;
        } else {
          // newImageUri already a URL; just set it
          updates.image = newImageUri;
        }
      }
    }

    if (typeof text !== 'undefined') {
      updates.text = text;
    }

    if (typeof gradient !== 'undefined') {
      updates.gradient = gradient;
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = serverTimestamp();
      await updateDoc(postRef, updates);
    }

    return { id: postId, ...updates };
  } catch (error) {
    console.error('Error al actualizar post:', error);
    throw error;
  }
};
