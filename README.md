# Gestion des tâches

Application React/Vite pour l’interface, Express pour l’API et PostgreSQL pour les données.

## Lancer le projet

Prérequis : Docker avec Compose, Node.js et npm.

1. Créer le fichier d’environnement à la racine et remplacer les valeurs d’exemple :

	```powershell
	Copy-Item .env.example .env
	```

2. Démarrer PostgreSQL et l’API :

	```powershell
	docker compose up --build -d
	```

3. Dans un terminal, installer et démarrer l’interface :

	```powershell
	npm --prefix frontend ci
	npm --prefix frontend run dev
	```

4. Ouvrir <http://localhost:5173/>. L’API est disponible sur <http://localhost:3000/>.

Arrêter les services Docker avec `docker compose down`. Cette commande conserve les données PostgreSQL dans son volume.

## Audits

Les captures ci-dessous ont été prises le 1 octobre 2026 sur le build de production servi en local, avec l’API accessible sur le port 5173. Lighthouse peut varier d’une exécution à l’autre.

### Lighthouse

| Catégorie | Score |
| --- | ---: |
| Performance | 61/100 |
| Accessibilité | 100/100 |
| Bonnes pratiques | 100/100 |
| SEO | 82/100 |

![Rapport Lighthouse sur le build de production](docs/audits/lighthouse.png)

Le rapport Lighthouse complet est disponible en [HTML](docs/audits/lighthouse.report.html) et [JSON](docs/audits/lighthouse.report.json).

### Accessibilité axe-core

Le scan axe-core CLI 4.13.0 a relevé **0 violation**, **30 règles réussies** et **0 résultat à vérifier**. Un scan automatisé ne remplace pas les vérifications manuelles, notamment au clavier et avec un lecteur d’écran.

![Résumé du rapport axe-core CLI](docs/audits/axe-core-cli-final.png)

Le résultat complet est conservé dans [le rapport JSON axe-core](docs/audits/axe-report.json). La capture est une synthèse de ce rapport CLI, pas une capture de l’extension axe DevTools.

### npm audit

Résultats du 1 octobre 2026 :

| Commande | Résultat |
| --- | --- |
| `npm audit` (API, racine) | 0 vulnérabilité |
| `npm audit --prefix frontend` | 0 vulnérabilité |

Relancer ces commandes après une mise à jour des dépendances.

## Fiche du traitement RGPD

- **Responsable du traitement :** l’association qui exploite l’application ; son identité doit être renseignée avant mise en production.
- **Finalité :** organiser les tâches et indiquer, si souhaité, le bénévole qui en est chargé.
- **Données traitées :** titre et état de la tâche ; prénom seul du bénévole, facultatif. Aucun nom de famille, e-mail ou numéro de téléphone n’est demandé.
- **Personnes concernées :** bénévoles dont le prénom est saisi dans une tâche.
- **Base légale :** à déterminer et documenter par l’association selon son contexte ; elle ne peut pas être déduite du code.
- **Durée de conservation :** tant que la tâche est conservée. Le prénom peut être retiré séparément avec « Retirer le bénévole » ; supprimer la tâche supprime également le prénom associé.
- **Destinataires :** utilisateurs et personnes chargées de l’exploitation qui peuvent accéder à l’application et à sa base de données. L’API ne met pas en œuvre d’authentification : l’accès réseau doit être restreint et les mesures d’accès définies par l’exploitant.
- **Droits :** les demandes d’accès, de rectification ou d’effacement peuvent être adressées à `contact@association.example`. Cette adresse est un exemple à remplacer par un contact réel.
- **Hébergement et transferts :** à préciser selon l’environnement retenu pour le déploiement.

## Questions de sécurité et confidentialité

1. **Pourquoi aucune variable `VITE_` ne contient-elle de secret ?** Vite intègre les variables préfixées `VITE_` dans le code envoyé au navigateur ; elles sont donc lisibles par les utilisateurs. `VITE_API_URL` est une adresse publique, tandis que les identifiants de base de données restent côté serveur.
2. **Pourquoi la validation du frontend ne suffit-elle pas ?** Un client peut être modifié ou contourné et des requêtes peuvent être envoyées sans l’interface. L’API valide donc aussi les entrées avec Joi avant d’interroger la base.
3. **Pourquoi l’application n’a-t-elle pas besoin de bandeau cookies ?** Elle ne dépose pas de cookies, n’utilise pas de traceur ou de stockage non essentiel et ne charge pas de script tiers. Cela ne dispense pas l’association de fournir l’information RGPD ci-dessus ; un bandeau devra être réévalué si des traceurs ou cookies non essentiels sont ajoutés.
