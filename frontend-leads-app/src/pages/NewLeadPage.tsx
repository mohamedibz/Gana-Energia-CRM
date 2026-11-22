import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { LeadForm } from '../components/LeadForm';
import { useApi } from '../hooks/useApi';
import { toast } from '../toast';

export function NewLeadPage() {
  const navigate = useNavigate();
  const { data: weights } = useApi(api.getWeights, []);

  return (
    <>
      <Link to="/leads">← Volver al listado</Link>
      <h1>Nuevo lead</h1>
      <div className="card">
        <LeadForm
          submitLabel="Crear lead"
          weights={weights}
          assignmentChoice
          onSubmit={async ({ asignarme, ...input }) => {
            const lead = await api.createLead({ ...input, asignarme: asignarme ?? false });
            toast.success(asignarme ? 'Lead creado y asignado a ti' : 'Lead creado sin asignar');
            navigate(`/leads/${lead.id}`);
          }}
          onCancel={() => navigate('/leads')}
        />
      </div>
    </>
  );
}
