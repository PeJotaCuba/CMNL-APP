export interface GeneratedAgenda {
    id: string;
    filename: string;
    blob?: Blob;
    createdAt: string; // ISO date
    month: string;
    weekLabel: string;
}

export const saveAgendaPdf = async (agenda: GeneratedAgenda): Promise<void> => {
    try {
        // Convert blob to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                resolve(base64String);
            };
            reader.onerror = () => reject(new Error("Error reading PDF file"));
        });
        reader.readAsDataURL(agenda.blob!);
        const content = await base64Promise;

        const response = await fetch('/api/agenda-pdfs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: agenda.id,
                filename: agenda.filename,
                content: content,
                createdAt: agenda.createdAt,
                month: agenda.month,
                weekLabel: agenda.weekLabel
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server Error ${response.status}`);
        }
    } catch (error: any) {
        console.error("Error saving agenda pdf:", error);
        throw error;
    }
};

export const loadAgendaPdfs = async (): Promise<GeneratedAgenda[]> => {
    try {
        const response = await fetch('/api/agenda-pdfs');
        if (!response.ok) throw new Error("Error loading PDFs from server");
        const data = await response.json();
        return data.map((item: any) => ({
            ...item,
            // blob is fetched on demand
        }));
    } catch (error) {
        console.error("Error cargando agendas de DB:", error);
        return [];
    }
};

export const getAgendaPdfBlob = async (id: string): Promise<Blob> => {
    const response = await fetch(`/api/agenda-pdfs/${id}`);
    if (!response.ok) throw new Error("Error fetching PDF blob");
    return await response.blob();
};

export const deleteAgendaPdf = async (id: string): Promise<void> => {
    try {
        const response = await fetch(`/api/agenda-pdfs/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error("Error deleting PDF from server");
    } catch (e) {
        console.error("Error deleting PDF:", e);
        throw e;
    }
};

export const deleteAllAgendaPdfs = async (): Promise<void> => {
    try {
        const response = await fetch('/api/agenda-pdfs', {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error("Error deleting all PDFs from server");
    } catch (e) {
        console.error("Error deleting all PDFs:", e);
        throw e;
    }
};
