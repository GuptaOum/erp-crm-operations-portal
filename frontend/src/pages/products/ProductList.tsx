import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import {
  adjustStock,
  fetchCategories,
  fetchProducts,
  uploadProductImage,
} from '../../api/products';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';
import { useAuth } from '../../auth/AuthContext';
import { can } from '../../auth/permissions';
import { useDebounce } from '../../hooks/useDebounce';
import { PageMeta, Product } from '../../types';
import { formatCurrency } from '../../utils/format';

export function ProductList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [lowStock, setLowStock] = useState(searchParams.get('lowStock') === 'true');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [movementType, setMovementType] = useState('IN');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const debouncedSearch = useDebounce(search);
  const canManage = can(user?.role, 'manageProducts');

  const load = useCallback(() => {
    setLoading(true);

    return fetchProducts({
      page,
      limit: 20,
      search: debouncedSearch,
      category,
      lowStock: lowStock ? 'true' : undefined,
    })
      .then((result) => {
        setProducts(result.data);
        setMeta(result.meta);
        setError('');
      })
      .catch((fetchError) => setError(getErrorMessage(fetchError)))
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, category, lowStock]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, lowStock]);

  useEffect(() => {
    const params: Record<string, string> = {};

    if (debouncedSearch) {
      params.search = debouncedSearch;
    }

    if (category) {
      params.category = category;
    }

    if (lowStock) {
      params.lowStock = 'true';
    }

    setSearchParams(params, { replace: true });
    load();
  }, [debouncedSearch, category, lowStock, page, setSearchParams, load]);

  function openAdjust(product: Product) {
    setAdjusting(product);
    setQuantity('');
    setMovementType('IN');
    setReason('');
    setError('');
  }

  async function handleAdjust(event: FormEvent) {
    event.preventDefault();

    if (!adjusting) {
      return;
    }

    setSaving(true);

    try {
      await adjustStock(adjusting.id, Number(quantity), movementType, reason);
      setAdjusting(null);
      await load();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  async function handleImage(product: Product, file: File) {
    setError('');

    try {
      await uploadProductImage(product.id, file);
      await load();
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Catalogue, pricing and current stock position</p>
        </div>
        {canManage ? (
          <div className="page-actions">
            <Link className="btn btn-secondary" to="/stock-movements">
              Stock movements
            </Link>
            <Link className="btn" to="/products/new">
              Add product
            </Link>
          </div>
        ) : null}
      </div>

      <div className="filters">
        <div className="field">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            value={search}
            placeholder="Name, SKU or category"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="lowStock">Stock</label>
          <select
            id="lowStock"
            value={lowStock ? 'true' : ''}
            onChange={(event) => setLowStock(event.target.value === 'true')}
          >
            <option value="">All products</option>
            <option value="true">At or below alert level</option>
          </select>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="empty">Loading products</div>
          ) : products.length === 0 ? (
            <div className="empty">No products match these filters</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th className="text-right">Unit price</th>
                  <th className="text-right">Stock</th>
                  <th>Location</th>
                  {canManage ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      {product.imageUrl ? (
                        <img className="product-thumb" src={product.imageUrl} alt={product.name} />
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    <td className="nowrap">{product.sku}</td>
                    <td>{product.name}</td>
                    <td>{product.category}</td>
                    <td className="text-right nowrap">{formatCurrency(product.unitPrice)}</td>
                    <td className="text-right">
                      {product.currentStock <= product.minStockAlert ? (
                        <span className="badge badge-danger">{product.currentStock}</span>
                      ) : (
                        product.currentStock
                      )}
                    </td>
                    <td className="nowrap">{product.location}</td>
                    {canManage ? (
                      <td>
                        <div className="row-actions">
                          <Link
                            className="btn btn-secondary btn-small"
                            to={`/products/${product.id}/edit`}
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="btn btn-secondary btn-small"
                            onClick={() => openAdjust(product)}
                          >
                            Adjust
                          </button>
                          <label className="btn btn-secondary btn-small file-button">
                            Image
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={(event) => {
                                const file = event.target.files?.[0];

                                if (file) {
                                  handleImage(product, file);
                                }

                                event.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {meta ? <Pagination meta={meta} onChange={setPage} /> : null}
      </div>

      {adjusting ? (
        <Modal title={`Adjust stock for ${adjusting.sku}`} onClose={() => setAdjusting(null)}>
          <form onSubmit={handleAdjust}>
            <div className="field">
              <label htmlFor="movementType">Movement</label>
              <select
                id="movementType"
                value={movementType}
                onChange={(event) => setMovementType(event.target.value)}
              >
                <option value="IN">Stock in</option>
                <option value="OUT">Stock out</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="quantity">Quantity</label>
              <input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="reason">Reason</label>
              <input
                id="reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Purchase receipt, damage, correction"
                required
              />
            </div>
            <p className="muted">Current stock {adjusting.currentStock}</p>
            <div className="form-actions">
              <button type="submit" className="btn" disabled={saving}>
                {saving ? 'Saving' : 'Record movement'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAdjusting(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
