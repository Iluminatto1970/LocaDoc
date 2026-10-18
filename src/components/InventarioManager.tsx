import React, { useState } from 'react';
import { InventarioItem, ContractData } from '../types/contract';
import { DEFAULT_INVENTARIO_ITEMS } from '../utils/defaults';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Trash2, Edit2, Check, Printer, Download, Sparkles, 
  RotateCcw, Search, CheckSquare, Layers, FolderPlus, 
  FolderEdit, FolderMinus, Copy, FileText, Image as ImageIcon, 
  Upload, X, Eye, MessageSquare, Lock, ShieldCheck 
} from 'lucide-react';

interface InventarioManagerProps {
  contract: ContractData;
  onUpdateInventario: (items: InventarioItem[]) => void;
  onUpdateVistos: (vistoLocador: string, vistoLocatario: string) => void;
}

export const InventarioManager: React.FC<InventarioManagerProps> = ({
  contract,
  onUpdateInventario,
  onUpdateVistos,
}) => {
  const { user } = useAuth();
  const isTenant = user?.role === 'cliente';

  const [items, setItems] = useState<InventarioItem[]>([...contract.inventario]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComodo, setSelectedComodo] = useState<string>('todos');
  const [vistoLocador, setVistoLocador] = useState(contract.vistoLocador || contract.locador.nome || '');
  const [vistoLocatario, setVistoLocatario] = useState(contract.vistoLocatario || contract.locatario.nome || '');
  
  // Modals state
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventarioItem | null>(null);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showRenameRoomModal, setShowRenameRoomModal] = useState(false);
  const [roomToRename, setRoomToRename] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState<string | null>(null);
  const [confirmResetDefaults, setConfirmResetDefaults] = useState(false);

  // Photo viewer lightbox
  const [galleryPhotos, setGalleryPhotos] = useState<string[] | null>(null);
  const [galleryTitle, setGalleryTitle] = useState('');

  // Item form state
  const [formComodo, setFormComodo] = useState('Sala de Estar');
  const [formNome, setFormNome] = useState('');
  const [formMarca, setFormMarca] = useState('');
  const [formEstado, setFormEstado] = useState('Em perfeito estado e funcionamento');
  const [formObs, setFormObs] = useState('');
  const [formObsLocador, setFormObsLocador] = useState('');
  const [formObsLocatario, setFormObsLocatario] = useState('');
  const [formFotos, setFormFotos] = useState<string[]>([]);

  // Available rooms list (dynamic from items and presets)
  const defaultRooms = ['Sala de Estar', 'Cozinha', 'Dormitório 1', 'Banheiro', 'Geral'];
  const comodosList = Array.from(new Set([...defaultRooms, ...items.map((i) => i.comodo)])).filter(Boolean);

  // Sync state to parent
  const commitItems = (updated: InventarioItem[]) => {
    setItems(updated);
    onUpdateInventario(updated);
  };

  // --- CRUD: CÔMODOS (ROOMS) ---
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const name = newRoomName.trim();
    setSelectedComodo(name);
    setShowAddRoomModal(false);
    setNewRoomName('');
  };

  const handleRenameRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomToRename || !newRoomName.trim()) return;
    const targetOld = roomToRename;
    const targetNew = newRoomName.trim();

    const updated = items.map((i) => (i.comodo === targetOld ? { ...i, comodo: targetNew } : i));
    commitItems(updated);
    if (selectedComodo === targetOld) setSelectedComodo(targetNew);

    setShowRenameRoomModal(false);
    setRoomToRename('');
    setNewRoomName('');
  };

  const handleDeleteRoom = (roomName: string) => {
    const updated = items.filter((i) => i.comodo !== roomName);
    commitItems(updated);
    if (selectedComodo === roomName) setSelectedComodo('todos');
    setConfirmDeleteRoom(null);
  };

  // --- CRUD: ITENS (ITEMS) ---
  const handleOpenAddModal = (defaultComodo?: string) => {
    setEditingItem(null);
    setFormComodo(defaultComodo || (selectedComodo !== 'todos' ? selectedComodo : 'Sala de Estar'));
    setFormNome('');
    setFormMarca('');
    setFormEstado('Firme, estofamento higienizado / Funcionamento 100%');
    setFormObs('Sem avarias, riscos ou manchas');
    setFormObsLocador('');
    setFormObsLocatario('');
    setFormFotos([]);
    setShowAddItemModal(true);
  };

  const handleOpenEditModal = (item: InventarioItem) => {
    setEditingItem(item);
    setFormComodo(item.comodo);
    setFormNome(item.item);
    setFormMarca(item.marcaModelo);
    setFormEstado(item.estado);
    setFormObs(item.observacoes);
    setFormObsLocador(item.observacoesLocador || '');
    setFormObsLocatario(item.observacoesLocatario || '');
    setFormFotos(item.fotos || []);
    setShowAddItemModal(true);
  };

  const handleItemPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormFotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFormPhoto = (idx: number) => {
    setFormFotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) return;

    if (editingItem) {
      // UPDATE
      const updated = items.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              comodo: formComodo.trim() || 'Geral',
              item: formNome.trim(),
              marcaModelo: formMarca.trim() || 'Não especificado',
              estado: formEstado.trim() || 'Bom estado de conservação',
              observacoes: formObs.trim() || 'Sem avarias',
              observacoesLocador: formObsLocador.trim() || undefined,
              observacoesLocatario: formObsLocatario.trim() || undefined,
              fotos: formFotos,
            }
          : i
      );
      commitItems(updated);
    } else {
      // CREATE
      const newItem: InventarioItem = {
        id: `inv-${Date.now()}`,
        comodo: formComodo.trim() || 'Geral',
        item: formNome.trim(),
        marcaModelo: formMarca.trim() || 'Não especificado',
        estado: formEstado.trim() || 'Bom estado de conservação',
        observacoes: formObs.trim() || 'Sem avarias',
        observacoesLocador: formObsLocador.trim() || undefined,
        observacoesLocatario: formObsLocatario.trim() || undefined,
        fotos: formFotos,
      };
      commitItems([...items, newItem]);
    }

    setShowAddItemModal(false);
  };

  const handleDeleteItem = (id: string) => {
    commitItems(items.filter((i) => i.id !== id));
  };

  const handleDuplicateItem = (item: InventarioItem) => {
    const copy: InventarioItem = {
      ...item,
      id: `inv-${Date.now()}`,
      item: `${item.item} (Cópia)`,
    };
    commitItems([...items, copy]);
  };

  const handleCellChange = (id: string, field: keyof InventarioItem, val: any) => {
    const updated = items.map((i) => (i.id === id ? { ...i, [field]: val } : i));
    commitItems(updated);
  };

  const handleResetToDefaults = () => {
    commitItems(DEFAULT_INVENTARIO_ITEMS);
    setConfirmResetDefaults(false);
  };

  const handleVistoChange = (l: string, t: string) => {
    setVistoLocador(l);
    setVistoLocatario(t);
    onUpdateVistos(l, t);
  };

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchesRoom = selectedComodo === 'todos' || item.comodo === selectedComodo;
    const matchesSearch =
      item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.marcaModelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.estado.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.observacoes.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRoom && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-700 font-bold shrink-0">
            <FileText className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ANEXO I – Laudo de Vistoria e Inventário de Bens Móveis
            </h2>
            <p className="text-xs text-slate-500">
              Adicione itens, cômodos, fotos detalhadas e observações manuais do locador e locatário
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {isTenant ? (
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl flex items-center gap-1.5 border border-slate-200">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Modo Vistoria do Inquilino (Somente Leitura de Itens)</span>
              </span>
            </div>
          ) : (
            <>
              {confirmResetDefaults ? (
                <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-lg border border-amber-200">
                  <span className="text-[10px] text-amber-900 font-bold px-1">Restaurar padrão?</span>
                  <button
                    type="button"
                    onClick={handleResetToDefaults}
                    className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded cursor-pointer"
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetDefaults(false)}
                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded cursor-pointer"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmResetDefaults(true)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Restaurar itens padrão"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Modelo Padrão</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowAddRoomModal(true)}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5 text-slate-700" />
                <span>Novo Cômodo</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAddModal()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Adicionar Item</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Room Tabs & Management */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 no-print">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedComodo('todos')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedComodo === 'todos'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos os Cômodos ({items.length})
            </button>

            {comodosList.map((room) => {
              const count = items.filter((i) => i.comodo === room).length;
              const isSelected = selectedComodo === room;
              return (
                <div key={room} className="inline-flex items-center rounded-lg overflow-hidden border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSelectedComodo(room)}
                    className={`px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {room} ({count})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRoomToRename(room);
                      setNewRoomName(room);
                      setShowRenameRoomModal(true);
                    }}
                    title="Renomear Cômodo"
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 border-l border-slate-200"
                  >
                    <FolderEdit className="w-3 h-3" />
                  </button>

                  {confirmDeleteRoom === room ? (
                    <div className="flex items-center gap-0.5 bg-red-50 p-0.5 border-l border-red-200">
                      <button
                        type="button"
                        onClick={() => handleDeleteRoom(room)}
                        className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold rounded cursor-pointer"
                        title="Confirmar exclusão"
                      >
                        Excluir
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteRoom(null)}
                        className="px-1 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[9px] font-bold rounded cursor-pointer"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteRoom(room)}
                      title="Excluir Cômodo e itens"
                      className="p-1.5 bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-600 border-l border-slate-200 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick add in selected room */}
          {selectedComodo !== 'todos' && (
            <button
              type="button"
              onClick={() => handleOpenAddModal(selectedComodo)}
              className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Adicionar em {selectedComodo}</span>
            </button>
          )}
        </div>

        {/* Search filter */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por item, marca, modelo, estado ou observações..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Table Matching Legal Contract Columns */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3 border-r border-slate-300 w-36">Cômodo</th>
                <th className="p-3 border-r border-slate-300 w-44">Item / Equipamento</th>
                <th className="p-3 border-r border-slate-300 w-44">Marca / Modelo</th>
                <th className="p-3 border-r border-slate-300">Estado de Funcionamento / Estético</th>
                <th className="p-3 border-r border-slate-300">Observações & Notas</th>
                <th className="p-3 border-r border-slate-300 w-24 text-center">Fotos</th>
                <th className="p-3 text-center w-28 no-print">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Nenhum item encontrado no filtro. Adicione itens acima para compor o inventário.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Cômodo */}
                    <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-900">
                      <input
                        type="text"
                        value={item.comodo}
                        onChange={(e) => handleCellChange(item.id, 'comodo', e.target.value)}
                        className="w-full p-1 text-xs bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-amber-400 rounded transition-colors font-medium text-slate-900"
                      />
                    </td>

                    {/* Item */}
                    <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">
                      <input
                        type="text"
                        value={item.item}
                        onChange={(e) => handleCellChange(item.id, 'item', e.target.value)}
                        className="w-full p-1 text-xs bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-amber-400 rounded transition-colors font-bold text-slate-900"
                      />
                    </td>

                    {/* Marca / Modelo */}
                    <td className="p-2.5 border-r border-slate-200 text-slate-700">
                      <input
                        type="text"
                        value={item.marcaModelo}
                        onChange={(e) => handleCellChange(item.id, 'marcaModelo', e.target.value)}
                        className="w-full p-1 text-xs bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-amber-400 rounded transition-colors"
                      />
                    </td>

                    {/* Estado */}
                    <td className="p-2.5 border-r border-slate-200 text-slate-700">
                      <input
                        type="text"
                        value={item.estado}
                        onChange={(e) => handleCellChange(item.id, 'estado', e.target.value)}
                        className="w-full p-1 text-xs bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-amber-400 rounded transition-colors"
                      />
                    </td>

                    {/* Observações / Detalhes + Notas Locador e Locatário */}
                    <td className="p-2.5 border-r border-slate-200 text-slate-600">
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={item.observacoes}
                          onChange={(e) => handleCellChange(item.id, 'observacoes', e.target.value)}
                          className="w-full p-1 text-xs bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-amber-400 rounded transition-colors"
                        />

                        {item.observacoesLocador && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                            <strong>Nota Locador:</strong> {item.observacoesLocador}
                          </div>
                        )}

                        {item.observacoesLocatario && (
                          <div className="text-[11px] text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                            <strong>Nota Locatário:</strong> {item.observacoesLocatario}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Fotos */}
                    <td className="p-2.5 border-r border-slate-200 text-center">
                      {item.fotos && item.fotos.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setGalleryPhotos(item.fotos || []);
                            setGalleryTitle(`${item.item} (${item.comodo})`);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md font-bold text-[11px] transition-colors cursor-pointer"
                          title="Visualizar Fotos Anexadas"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
                          <span>{item.fotos.length}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="text-[10px] text-slate-400 hover:text-slate-700 underline"
                          title="Anexar Fotos"
                        >
                          + Fotos
                        </button>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="p-2 text-center no-print">
                      {isTenant ? (
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.fotos && item.fotos.length > 0) {
                                setGalleryPhotos(item.fotos);
                                setGalleryTitle(`${item.item} (${item.comodo})`);
                              } else {
                                handleOpenEditModal(item);
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors"
                            title="Ver Detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1 text-slate-400 hover:text-slate-800 rounded transition-colors"
                            title="Editar detalhadamente e fotos"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateItem(item)}
                            className="p-1 text-slate-400 hover:text-slate-800 rounded transition-colors"
                            title="Duplicar item"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Excluir item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Termo de Conferência do Inventário */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="text-center space-y-1 max-w-xl mx-auto">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900">
            Termo de Conferência do Inventário
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Declaram as partes terem conferido presencialmente todos os itens listados acima e no registro fotográfico/vídeo da Cláusula 5.2.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Visto do(a) Locador(a) (Assinatura / Rubrica)
              </label>
              {isTenant && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Bloqueado
                </span>
              )}
            </div>
            <input
              type="text"
              disabled={isTenant}
              value={vistoLocador}
              onChange={(e) => handleVistoChange(e.target.value, vistoLocatario)}
              placeholder="Ex: Iluminatto Moraes"
              className={`w-full p-2.5 text-xs border rounded-lg font-medium ${
                isTenant ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            <span className="text-[11px] text-slate-400">
              Conferido presencialmente pelo proprietário ou preposto
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Visto do(a) Locatário(a) (Assinatura / Rubrica)
            </label>
            <input
              type="text"
              value={vistoLocatario}
              onChange={(e) => handleVistoChange(vistoLocador, e.target.value)}
              placeholder="Ex: Mariana D. Costa"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
            />
            <span className="text-[11px] text-slate-400">
              Conferido presencialmente pelo inquilino na entrega das chaves
            </span>
          </div>
        </div>
      </div>

      {/* Modal: Add/Edit Item with Photos & Observations */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs no-print overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm tracking-tight">
                  {editingItem ? 'Editar Item do Laudo de Vistoria' : 'Cadastrar Item no Laudo'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Preencha dados, observações manuais e anexe fotos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cômodo *
                  </label>
                  <select
                    value={formComodo}
                    onChange={(e) => setFormComodo(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    {comodosList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Item / Equipamento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: Sofá 3 lugares, Smart TV 50', Geladeira Frost Free"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Marca / Modelo
                  </label>
                  <input
                    type="text"
                    value={formMarca}
                    onChange={(e) => setFormMarca(e.target.value)}
                    placeholder="Ex: Samsung Crystal 4K, Brastemp Inverse Inox"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado de Funcionamento / Estético
                  </label>
                  <input
                    type="text"
                    value={formEstado}
                    onChange={(e) => setFormEstado(e.target.value)}
                    placeholder="Ex: Funcionamento 100%, sem avarias"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              {/* Photos upload for this item */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Fotos do Item (Várias fotos permitidas)
                  </label>
                  <label className="text-xs text-amber-700 font-semibold cursor-pointer hover:underline flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Adicionar Fotos</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleItemPhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {formFotos.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {formFotos.map((f, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-300 aspect-square">
                        <img src={f} alt="Item" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFormPhoto(i)}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover Foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                    Nenhuma foto anexada a este item. Clique em "Adicionar Fotos" para registrar o estado visual.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações Gerais / Detalhes do Item
                </label>
                <textarea
                  rows={2}
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  placeholder="Ex: Acompanha controle remoto, manual e cabos..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 resize-none"
                />
              </div>

              {/* Manual observations from Landlord and Tenant */}
              <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-3">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide block">
                  Anotações Manuais Específicas das Partes
                </span>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Observação do(a) Locador(a) (Manual)
                  </label>
                  <input
                    type="text"
                    value={formObsLocador}
                    onChange={(e) => setFormObsLocador(e.target.value)}
                    placeholder="Ex: Móvel revisado antes da entrega"
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Observação do(a) Locatário(a) (Manual)
                  </label>
                  <input
                    type="text"
                    value={formObsLocatario}
                    onChange={(e) => setFormObsLocatario(e.target.value)}
                    placeholder="Ex: Verificado em funcionamento na entrega das chaves"
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs cursor-pointer"
                >
                  {editingItem ? 'Salvar Alterações' : 'Adicionar ao Laudo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Room */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs no-print">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wide">Criar Novo Cômodo</h3>
              <button
                type="button"
                onClick={() => setShowAddRoomModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateRoom} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Cômodo
                </label>
                <input
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Ex: Suíte Master, Sacada Gourmet, Escritório"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg"
                >
                  Criar Cômodo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rename Room */}
      {showRenameRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs no-print">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wide">Renomear Cômodo</h3>
              <button
                type="button"
                onClick={() => setShowRenameRoomModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRenameRoom} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Novo Nome para "{roomToRename}"
                </label>
                <input
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenameRoomModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Gallery Lightbox Modal */}
      {galleryPhotos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm no-print">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-xs">{galleryTitle}</h4>
              </div>
              <button
                type="button"
                onClick={() => setGalleryPhotos(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {galleryPhotos.map((p, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                    <img src={p} alt={`Foto ${i + 1}`} className="w-full h-56 object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
