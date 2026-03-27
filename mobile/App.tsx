import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, Image, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { catalogApi } from './src/api/client';
import { ShoppingCart, Search, Menu } from 'lucide-react-native';

export default function App() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await catalogApi.getProducts();
      setProducts(data.products || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderProduct = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card}>
      <Image 
        source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }} 
        style={styles.image} 
        resizeMode="contain"
      />
      <View style={styles.cardContent}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productPrice}>
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Menu color="#333" size={24} />
        <Text style={styles.headerTitle}>QH COMPUTER</Text>
        <View style={styles.headerIcons}>
          <Search color="#333" size={24} style={{ marginRight: 16 }} />
          <ShoppingCart color="#333" size={24} />
        </View>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.productList}
          columnWrapperStyle={styles.row}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#e11d48',
    letterSpacing: 1,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productList: {
    padding: 8,
  },
  row: {
    flex: 1,
    justifyContent: 'space-around',
  },
  card: {
    flex: 1,
    margin: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 120,
    marginBottom: 12,
  },
  cardContent: {
    gap: 4,
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#e11d48',
  },
});
